"""Plan v2 stages run in the main env (see plan_v2.md). Results: reports/v2/<stage>/, decisions: reports/v2/decisions.json.

Run:  python -m ml.run_v2 --stage s1 | s2a | s2b | s3t | s3c | s6 | s7 | s8

S1 cleaning + preprocessing, screened on r0-r4 with three untuned probes (LR, CatBoost, TabPFN-GPU):
  C1 F0 raw vs F1 cleaned       domain clean-up: adopted unless it hurts (mean delta >= 0, no probe > 1 SE worse)
  C2 rare binary features       keep vs drop vs merge: a change needs the keep rule
  C3 inconsistent label         drop the Cath=Normal-but-stenotic patient from training folds: needs the keep rule
  P1 linear scaling (LR probe)  standard vs robust (winsor + log) vs quantile-normal: needs > 1 SE
  P2 linear categoricals        one-hot vs ordinal: needs > 1 SE
"""

from __future__ import annotations

import argparse
import json

import numpy as np
import pandas as pd

from ml.cv import OOF_DIR, CVResult, run_cv
from ml.data import ROOT

from ml.cv import load_folds
from ml.data import TARGETS, VESSELS, load_clean
from ml.v2 import (SCREEN, V2, DropTrainRows, compare, decisions, jobs, keep_rule, probes, save_decision, score,
                   view)


def s1(df, folds, targets):
    out = V2 / "s1"
    out.mkdir(parents=True, exist_ok=True)
    inconsistent = tuple(df.index[(df.cad == 0) & (df[VESSELS].max(axis=1) == 1)])
    rows = []
    for t in targets:
        y = df[t].values

        def run(spec, probe, tag, model=None):
            return score(model or probes()[probe], view(df, spec), y, t, f"v2s1_{probe}_{tag}", folds, jobs(probe))

        # C1: F0 vs F1
        c1 = []
        for p in probes():
            r = {"target": t, "exp": "C1 F0->F1", "probe": p, **compare(run({"base": "F0"}, p, "F0"), run({}, p, "F1"))}
            c1.append(r)
        c1 = pd.DataFrame(c1)
        base = "F1" if c1.delta.mean() >= 0 and not c1.hurt.any() else "F0"
        rows += c1.to_dict("records")

        # C2: rare binary features (relative to the chosen base)
        ref = {p: run({"base": base}, p, base) for p in probes()}
        rare = "keep"
        best_gain = 0.0
        for mode in ("drop", "merge"):
            c2 = pd.DataFrame([{"target": t, "exp": f"C2 rare {mode}", "probe": p,
                                **compare(ref[p], run({"base": base, "rare": mode}, p, f"{base}_rare{mode}"))}
                               for p in probes()])
            rows += c2.to_dict("records")
            if keep_rule(c2) and c2.delta.mean() > best_gain:
                rare, best_gain = mode, c2.delta.mean()
        spec = {"base": base, "rare": rare}
        tag = f"{base}" + (f"_rare{rare}" if rare != "keep" else "")
        ref = {p: run(spec, p, tag) for p in probes()}

        # C3: drop the inconsistent patient from training folds
        c3 = pd.DataFrame([{"target": t, "exp": "C3 drop inconsistent", "probe": p,
                            **compare(ref[p], run(spec, p, f"{tag}_dropinc",
                                                  DropTrainRows(probes()[p], inconsistent)))} for p in probes()])
        rows += c3.to_dict("records")
        drop_inc = keep_rule(c3)

        # P1 / P2: linear preprocessing, LR probe only
        X = view(df, spec)
        lin = {"scaling": "standard", "onehot": True}
        lr_ref = score(probes(lin)["logreg"], X, y, t, f"v2s1_logreg_{tag}_standard_onehot", folds, 20)
        for scaling in ("robust", "quantile"):
            c = compare(lr_ref, score(probes({"scaling": scaling, "onehot": True})["logreg"], X, y, t,
                                      f"v2s1_logreg_{tag}_{scaling}_onehot", folds, 20))
            rows.append({"target": t, "exp": f"P1 scaling {scaling}", "probe": "logreg", **c})
            if c["keep"] and c["auc"] > lr_ref.summary["auc_mean"]:
                lin["scaling"] = scaling
        c = compare(lr_ref, score(probes({"scaling": "standard", "onehot": False})["logreg"], X, y, t,
                                  f"v2s1_logreg_{tag}_standard_ordinal", folds, 20))
        rows.append({"target": t, "exp": "P2 ordinal categoricals", "probe": "logreg", **c})
        if c["keep"]:
            lin["onehot"] = False

        save_decision(t, "view", spec)
        save_decision(t, "drop_inconsistent", drop_inc)
        save_decision(t, "linear", lin)
        print(f"[{t}] S1 decisions: view {spec}, drop_inconsistent {drop_inc}, linear {lin}", flush=True)

    table = pd.DataFrame(rows)
    table.to_csv(out / "s1_results.csv", index=False, float_format="%.4f")
    print(table.round(4).to_string(index=False))
    print({t: decisions()[t] for t in targets})


def s2a(df, folds, targets):
    """S2 / FE1: each engineered candidate added to (or replacing columns in) the S1 view, three probes, keep rule."""
    from ml.features import CANDIDATES

    out = V2 / "s2"
    out.mkdir(parents=True, exist_ok=True)
    variants = [(c, "add") for c in CANDIDATES] + [(c, "replace") for c in ("nlr", "comorbidity_count")]
    rows = []
    for t in targets:
        y, base = df[t].values, decisions()[t]["view"]
        lin = decisions()[t]["linear"]
        tag = f"{base['base']}_rare{base['rare']}"
        ref = {p: score(probes(lin)[p], view(df, base), y, t, f"v2s2_{p}_{tag}", folds, jobs(p)) for p in probes()}
        for cand, mode in variants:
            spec = {**base, mode: [cand]}
            res = pd.DataFrame([{"target": t, "candidate": cand, "mode": mode, "probe": p,
                                 **compare(ref[p], score(probes(lin)[p], view(df, spec), y, t,
                                                         f"v2s2_{p}_{tag}_{mode}_{cand}", folds, jobs(p)))}
                                for p in probes()])
            rows += res.to_dict("records")
            print(f"[{t}] {mode} {cand}: mean delta {res.delta.mean():+.4f} keep={keep_rule(res)}", flush=True)
    table = pd.DataFrame(rows)
    table.to_csv(out / "fe1_candidates.csv", index=False, float_format="%.4f")
    for t in targets:
        g = table[table.target == t]
        agg = g.groupby(["candidate", "mode"]).apply(lambda r: pd.Series({"mean_delta": r.delta.mean(),
                                                                          "selected": keep_rule(r)}))
        sel = agg[agg.selected].sort_values("mean_delta", ascending=False)
        add, replace = [], []
        for cand in sel.index.get_level_values(0).unique():   # if both modes pass, keep the better one
            mode = sel.loc[cand].mean_delta.idxmax()
            (replace if mode == "replace" else add).append(cand)
        save_decision(t, "fe1", {"add": add, "replace": replace})
        print(f"[{t}] FE1 selected: add {add}, replace {replace}", flush=True)


def s2b(df, folds, targets):
    """S2 / FE2 risk scores -> F*; then FE3 interactions, FE5 TabPFN embeddings, FS1-FS4 selection on F*."""
    from sklearn.pipeline import Pipeline

    from ml.risk_scores import SCORES
    from ml.selection import StabilitySelection, TopKImportance, TopKMutualInfo, with_selector
    from ml.v2_fe import PairwiseProducts, TabPFNEmbedding

    out = V2 / "s2"
    out.mkdir(parents=True, exist_ok=True)
    rows = []

    def block(t, exp, ref, make_run, probe_names=None):
        res = pd.DataFrame([{"target": t, "exp": exp, "probe": p, **compare(ref[p], make_run(p))}
                            for p in (probe_names or list(probes()))])
        rows.extend(res.to_dict("records"))
        print(f"[{t}] {exp}: mean delta {res.delta.mean():+.4f} keep={keep_rule(res)}", flush=True)
        return res

    for t in targets:
        y, d = df[t].values, decisions()[t]
        lin = d["linear"]
        base = {**d["view"], "add": d["fe1"]["add"], "replace": d["fe1"]["replace"]}
        tag = f"{base['base']}_rare{base['rare']}_fe1"

        def run(spec, p, name, wrap=None, gpu=False):
            model = probes(lin)[p]
            n_jobs = 1 if gpu else jobs(p)   # anything holding a TabPFN must run one fold at a time on the GPU
            return score(wrap(model) if wrap else model, view(df, spec), y, t, f"v2s2b_{p}_{name}", folds, n_jobs)

        ref = {p: run(base, p, tag) for p in probes()}
        # ---- FE2: published risk scores, alone and as a group
        passed = {}
        for sc in list(SCORES) + ["ALL"]:
            risk = list(SCORES) if sc == "ALL" else [sc]
            r = block(t, f"FE2 +{sc}", ref, lambda p: run({**base, "risk": risk}, p, f"{tag}_risk{sc}"))
            if keep_rule(r):
                passed[sc] = r.delta.mean()
        singles = sorted([k for k in passed if k != "ALL"], key=passed.get, reverse=True)
        options = {}
        if len(singles) > 1:
            r = block(t, "FE2 +selected", ref, lambda p: run({**base, "risk": singles}, p, f"{tag}_riskSEL{len(singles)}"))
            if keep_rule(r):
                options["selected"] = (singles, r.delta.mean())
        if singles:
            options["best_single"] = ([singles[0]], passed[singles[0]])
        if "ALL" in passed:
            options["all"] = (list(SCORES), passed["ALL"])
        risk = max(options.values(), key=lambda o: o[1])[0] if options else []
        fstar = {**base, "risk": risk}
        save_decision(t, "fstar", fstar)
        ftag = f"{tag}_risk{len(risk)}"
        fref = {p: run(fstar, p, ftag) for p in probes()}
        # ---- FE3 pairwise interactions (in-fold), FE5 TabPFN embeddings (in-fold, OOF for training rows)
        fe3 = block(t, "FE3 pairwise top-10", fref,
                    lambda p: run(fstar, p, f"{ftag}_pairs10", lambda m: Pipeline([("fe", PairwiseProducts(10)), ("m", m)])))
        fe5 = block(t, "FE5 TabPFN embedding x8", fref,
                    lambda p: run(fstar, p, f"{ftag}_pfnemb8", lambda m: Pipeline([("fe", TabPFNEmbedding(8)), ("m", m)]),
                                  gpu=True),
                    ["logreg", "catboost"])
        save_decision(t, "fe3_pairs", keep_rule(fe3))
        save_decision(t, "fe5_embedding", keep_rule(fe5))
        # ---- FS1-FS4 selection on F* (FS1 = none is the reference)
        selectors = {**{f"rf{k}": TopKImportance(k, "rf") for k in (10, 20, 30)},
                     **{f"l1{k}": TopKImportance(k, "l1") for k in (10, 20, 30)},
                     **{f"mi{k}": TopKMutualInfo(k) for k in (10, 20, 30)}, "stability": StabilitySelection()}
        best_fs, best_gain = None, 0.0
        n_feat = view(df, fstar).shape[1]
        for name, sel in selectors.items():
            if name[-2:].isdigit() and int(name[-2:]) >= n_feat:
                continue
            r = block(t, f"FS {name}", fref, lambda p: run(fstar, p, f"{ftag}_fs{name}", lambda m: with_selector(sel, m)))
            if keep_rule(r) and r.delta.mean() > best_gain:
                best_fs, best_gain = name, r.delta.mean()
        save_decision(t, "selection", best_fs)
        print(f"[{t}] S2 decisions: F* risk={risk}, FE3={keep_rule(fe3)}, FE5={keep_rule(fe5)}, selection={best_fs}",
              flush=True)
    table = pd.DataFrame(rows)
    table.to_csv(out / "s2b_results.csv", index=False, float_format="%.4f")
    print({t: decisions()[t] for t in targets})


def s3t(df, folds, targets, trials: int = 50):
    """S3 TabPFN extreme (GPU, one process): checkpoints, 50-trial wide search incl. checkpoint and ensemble size,
    seed bag, fine-tuning. All on F* with the S2 in-fold steps (TabPFN embeddings are not fed to TabPFN itself)."""
    import optuna

    from ml.cv import load_folds, run_cv
    from ml.models import REGISTRY, make
    from ml.run_tabpfn_extra import NEW_DEFAULTS, wide_space
    from ml.v2 import TUNE, fstar, wrap

    optuna.logging.set_verbosity(optuna.logging.WARNING)
    out = V2 / "s3"
    out.mkdir(parents=True, exist_ok=True)
    tune_folds = load_folds(df)[TUNE]
    versions = ["v2.5", "v2.6", "v3", None]
    rows = []
    for t in targets:
        y, X = df[t].values, fstar(df, t)

        def run(model, name):
            return score(wrap(t, model, embed=False), X, y, t, f"v2s3t_{name}", folds, 1)

        # 1. checkpoints at their defaults
        res = {v or "v3.5": run(make("tabpfn", {"version": v, "n_estimators": 8}), f"ckpt_{v or 'v3.5'}") for v in versions}
        ref = res["v3.5"]
        for v, r in res.items():
            rows.append({"target": t, "exp": f"checkpoint {v}", **compare(ref, r)})
        # 2. wide search (r0-r2), warm-started from the defaults
        def space(trial):
            p = wide_space(trial)
            p["n_estimators"] = trial.suggest_categorical("n_est", [8, 16, 32])
            p["version"] = trial.suggest_categorical("version", ["v2.5", "v2.6", "v3", "v3.5"])
            p["version"] = None if p["version"] == "v3.5" else p["version"]
            return p

        def objective(trial):
            return run_cv(wrap(t, make("tabpfn", space(trial)), embed=False), X, y, folds=tune_folds, name="tune",
                          target=t, n_jobs=1, save=False, log=False).fold_metrics.auc.mean()

        study = optuna.create_study(direction="maximize", sampler=optuna.samplers.TPESampler(seed=2))
        base = {k: v for k, v in {**REGISTRY["tabpfn"].defaults, **NEW_DEFAULTS}.items() if k != "n_estimators"}
        study.enqueue_trial({**base, "n_est": 8, "version": "v3.5"})
        study.optimize(objective, n_trials=trials, catch=(Exception,))
        study.trials_dataframe(attrs=("number", "value", "params")).to_csv(out / f"s3t_trials_{t}.csv", index=False)
        best = space(optuna.trial.FixedTrial(study.best_params))
        tuned = run(make("tabpfn", best), "tuned")
        rows.append({"target": t, "exp": "tuned (50 trials)", **compare(ref, tuned)})
        chosen, params, n_seeds = (tuned, best, 1) if compare(ref, tuned)["keep"] else (ref, {"n_estimators": 8}, 1)
        # 3. seed bag
        bag = run(make("tabpfn", params, n_seeds=5), "tuned_seedbag5" if params is best else "default_seedbag5")
        c = compare(chosen, bag)
        rows.append({"target": t, "exp": "seed bag 5", **c})
        if c["delta"] > 0:
            chosen, n_seeds = bag, 5
        # 4. fine-tuning (v3.5, inner early stopping)
        ft = run(make("tabpfn_ft", {"epochs": 30, "learning_rate": 1e-5}), "finetune")
        c = compare(chosen, ft)
        rows.append({"target": t, "exp": "fine-tuned", **c})
        finetune = c["keep"]
        save_decision(t, "tabpfn", {"params": params, "n_seeds": n_seeds, "finetune": finetune,
                                    "screen_auc": (ft if finetune else chosen).summary["auc_mean"]})
        print(f"[{t}] S3t: tuned {best} -> chosen auc {chosen.summary['auc_mean']:.4f}, seeds {n_seeds}, "
              f"finetune {finetune} ({ft.summary['auc_mean']:.4f})", flush=True)
    table = pd.DataFrame(rows)
    table.to_csv(out / "s3t_tabpfn.csv", index=False, float_format="%.4f")
    print(table.round(4).to_string(index=False))


def s3c(df, folds, targets, n_jobs: int = 14):
    """S3 classical models re-tuned on F* (Optuna on r0-r2, phase-3 trial budgets), scored on r0-r4; 5-seed bag for
    stochastic models kept if better. Linear models use the S1 scaling choice; all use the S2 in-fold steps."""
    import optuna

    from ml.cv import load_folds, run_cv
    from ml.models import REGISTRY, make
    from ml.run_models import TRIALS
    from ml.v2 import TUNE, fstar, wrap

    optuna.logging.set_verbosity(optuna.logging.WARNING)
    out = V2 / "s3"
    out.mkdir(parents=True, exist_ok=True)
    tune_folds = load_folds(df)[TUNE]
    models = ["logreg", "svm_rbf", "knn", "gnb", "random_forest", "extra_trees", "xgboost", "lightgbm", "catboost", "ebm"]
    rows = []
    for t in targets:
        y, X, lin = df[t].values, fstar(df, t), decisions()[t]["linear"]
        best = {}
        for name in models:
            extra = lin if REGISTRY[name].family == "linear" else {}

            def objective(trial):
                params = {**REGISTRY[name].space(trial), **extra}
                return run_cv(wrap(t, make(name, params)), X, y, folds=tune_folds, name="tune", target=t,
                              n_jobs=n_jobs, save=False, log=False).fold_metrics.auc.mean()

            default = score(wrap(t, make(name, {**REGISTRY[name].defaults, **extra})), X, y, t,
                            f"v2s3c_{name}_default", folds, n_jobs)
            study = optuna.create_study(direction="maximize", sampler=optuna.samplers.TPESampler(seed=0))
            study.optimize(objective, n_trials=TRIALS[name])
            params = {**REGISTRY[name].defaults, **REGISTRY[name].space(optuna.trial.FixedTrial(study.best_params)), **extra}
            tuned = score(wrap(t, make(name, params)), X, y, t, f"v2s3c_{name}_tuned", folds, n_jobs)
            c = compare(default, tuned)
            chosen, final, n_seeds = (tuned, params, 1) if c["delta"] >= 0 else (default, {**REGISTRY[name].defaults, **extra}, 1)
            if REGISTRY[name].stochastic:
                bag = score(wrap(t, make(name, final, n_seeds=5)), X, y, t, f"v2s3c_{name}_seedbag5", folds, n_jobs)
                if compare(chosen, bag)["delta"] > 0:
                    chosen, n_seeds = bag, 5
            best[name] = {"params": final, "n_seeds": n_seeds, "run": chosen.name, "screen_auc": chosen.summary["auc_mean"]}
            rows.append({"target": t, "model": name, "auc_default": default.summary["auc_mean"],
                         "auc_tuned": tuned.summary["auc_mean"], "tuned_vs_default": c["delta"],
                         "auc_final": chosen.summary["auc_mean"], "n_seeds": n_seeds})
            print(f"[{t}] S3c {name}: default {default.summary['auc_mean']:.4f} tuned {tuned.summary['auc_mean']:.4f} "
                  f"final {chosen.summary['auc_mean']:.4f} (seeds {n_seeds})", flush=True)
        save_decision(t, "classical", best)
    table = pd.DataFrame(rows)
    table.to_csv(out / "s3c_classical.csv", index=False, float_format="%.4f")
    print(table.round(4).to_string(index=False))


def s6(df, folds, targets):
    """S6 multi-label strategies (M2 hierarchical, M3 stacked BR, M4 joint 8-pattern) and AngioCAD (E2 external
    validation both ways, E3 pooled localisation) with each label's best single model, on r0-r4."""
    from sklearn.impute import SimpleImputer
    from sklearn.metrics import roc_auc_score
    from sklearn.pipeline import Pipeline

    from ml.angiocad import aligned, load_angiocad
    from ml.data import TARGETS
    from ml.models import REGISTRY, make
    from ml.strategies import Hierarchical, Stacked, Upstream, oof_lookup
    from ml.v2 import best_single, fstar
    from ml.v2_strategies import JointPattern, PooledHierarchical, patterns

    out = V2 / "s6"
    out.mkdir(parents=True, exist_ok=True)
    ext = load_angiocad()
    diseased = df[VESSELS].max(axis=1).values
    pats = patterns(df)
    rows, extval = [], []

    def run(t, model, name, gpu):
        return score(model, fstar(df, t), df[t].values, t, f"v2s6_{name}", folds, 1 if gpu else 14)

    # every label's best single model on r0-r4 (the M1 / S0 reference); P(CAD) lookup for the hierarchy
    base = {}
    for t in TARGETS:
        name, model = best_single(t)
        base[t] = (name, model, run(t, model, f"{t}_S0_{name.replace(':', '_')}", name == "tabpfn"))
    cad_lookup = oof_lookup(folds, base["cad"][2].oof)
    upstream = {t: Upstream(t, wrap_lr(t), fstar(df, t), df[t].values) for t in TARGETS}

    for t in targets:
        name, model, s0 = base[t]
        gpu = name == "tabpfn"
        tag = f"{t}_{name.replace(':', '_')}"
        strategies = {"M4 joint 8-pattern": JointPattern(model, pats, t)}
        if t in VESSELS:
            strategies["M2 hierarchical"] = Hierarchical(model, diseased, cad_lookup=cad_lookup)
            strategies["M3 stacked BR"] = Stacked(model, [upstream[u] for u in TARGETS if u != t])
        for sname, fp in strategies.items():
            r = run(t, fp, f"{tag}_{sname.split()[0]}", gpu)
            rows.append({"target": t, "model": name, "exp": sname, **compare(s0, r)})
            print(f"[{t}] {sname}: auc {r.summary['auc_mean']:.4f} vs S0 {rows[-1]['delta']:+.4f} keep={rows[-1]['keep']}",
                  flush=True)
        # ---- E2: external validation on the columns both cohorts share, both directions (no selection uses it)
        shared = [c for c in fstar(df, t).columns if c in ext.columns]
        lr = Pipeline([("impute", SimpleImputer(strategy="median").set_output(transform="pandas")), ("m", make("logreg"))])
        za_on_ext = roc_auc_score(ext[t], lr.fit(df[shared], df[t]).predict_proba(ext[shared])[:, 1])
        ext_on_za = roc_auc_score(df[t], lr.fit(ext[shared], ext[t]).predict_proba(df[shared])[:, 1])
        extval.append({"target": t, "n_shared_features": len(shared), "zalizadeh_to_angiocad_auc": za_on_ext,
                       "angiocad_to_zalizadeh_auc": ext_on_za})
        print(f"[{t}] E2 external validation (LR, {len(shared)} shared features): Z->A {za_on_ext:.3f}, A->Z {ext_on_za:.3f}",
              flush=True)
        # ---- E3: pooled localisation, vessels only (relative to M2 with the same model)
        if t in VESSELS:
            m2 = run(t, Hierarchical(model, diseased, cad_lookup=cad_lookup), f"{tag}_M2", gpu)
            imputed = Pipeline([("impute", SimpleImputer(strategy="median", keep_empty_features=True)
                                 .set_output(transform="pandas")), ("m", model)])
            cols = fstar(df, t).columns
            for subset, sel in (("all", ext.cad == 1), ("angina", (ext.cad == 1) & (ext.acute == 0))):
                X_ext, y_ext = aligned(ext[sel], cols), ext.loc[sel, t].to_numpy()
                for w in (0.25, 0.5, 1.0):
                    fp = PooledHierarchical(imputed, diseased, cad_lookup, X_ext, y_ext, w)
                    r = run(t, fp, f"{tag}_E3_{subset}_w{w}", gpu)
                    rows.append({"target": t, "model": name, "exp": f"E3 pooled {subset} w={w}", **compare(m2, r),
                                 "vs_S0": compare(s0, r)["delta"]})
                    print(f"[{t}] E3 pooled {subset} w={w} (n_ext={len(y_ext)}): auc {r.summary['auc_mean']:.4f} "
                          f"vs M2 {rows[-1]['delta']:+.4f} keep={rows[-1]['keep']}", flush=True)
    pd.DataFrame(rows).to_csv(out / "s6_strategies.csv", index=False, float_format="%.4f")
    pd.DataFrame(extval).to_csv(out / "s6_external_validation.csv", index=False, float_format="%.4f")
    print(pd.DataFrame(rows).round(4).to_string(index=False))


def _tabpfn_screen_run(t) -> str:
    tp = decisions()[t]["tabpfn"]
    if tp["finetune"]:
        return "v2s3t_finetune"
    tuned = tp["params"] != {"n_estimators": 8}
    if tp["n_seeds"] == 5:
        return "v2s3t_tuned_seedbag5" if tuned else "v2s3t_default_seedbag5"
    return "v2s3t_tuned" if tuned else "v2s3t_ckpt_v3.5"


def _combine(t, parts: list[str], name: str) -> CVResult:
    """Stack CV results run on consecutive repeat blocks (e.g. r0-r1 + r2-r4) into one r0-r4 result."""
    res = [CVResult.load(t, p) for p in parts]
    fm, offset = [], 0
    for r in res:
        fm.append(r.fold_metrics.assign(repeat=r.fold_metrics.repeat + offset))
        offset += r.oof.shape[0]
    return CVResult(name, t, np.vstack([r.oof for r in res]), pd.concat(fm, ignore_index=True), res[0].y)


def candidate_pool(df, t, eval_folds, build_eval: bool):
    """{name: (r0-r4 result, r5-r9 result)} for every ensemble candidate of a label. With build_eval, missing
    r5-r9 runs of our own models are computed (AutoGluon finalists come from the AutoGluon env)."""
    from ml.data import TARGETS
    from ml.models import make
    from ml.strategies import Hierarchical, Stacked, Upstream, oof_lookup
    from ml.v2 import best_single, fstar, wrap
    from ml.v2_strategies import JointPattern, patterns

    d, y, X = decisions()[t], df[t].values, fstar(df, t)
    pool = {}

    def evaluate(name, model, gpu):
        path = OOF_DIR / t / f"v2e_{name}.npz"
        if path.exists():
            return CVResult.load(t, f"v2e_{name}")
        if not build_eval:
            return None
        return run_cv(model, X, y, folds=eval_folds, name=f"v2e_{name}", target=t, n_jobs=1 if gpu else 14,
                      algo=name, stage="v2_eval", repeats="r5-r9")

    for m, c in d["classical"].items():
        pool[f"classical:{m}"] = (CVResult.load(t, c["run"]),
                                  evaluate(f"classical_{m}", wrap(t, make(m, c["params"], n_seeds=c["n_seeds"])), False))
    tp = d["tabpfn"]
    tp_model = (make("tabpfn_ft", {"epochs": 30, "learning_rate": 1e-5}) if tp["finetune"]
                else make("tabpfn", tp["params"], n_seeds=tp["n_seeds"]))
    pool["tabpfn"] = (CVResult.load(t, _tabpfn_screen_run(t)), evaluate("tabpfn", wrap(t, tp_model, embed=False), True))
    # S6 strategies that passed the keep rule against their reference
    s6 = V2 / "s6" / "s6_strategies.csv"
    if s6.exists():
        kept = pd.read_csv(s6)
        kept = kept[(kept.target == t) & kept.keep & kept.exp.str.startswith(("M2", "M3", "M4"))]
        if len(kept):
            name, model = best_single(t)
            gpu = name == "tabpfn"
            tag = f"{t}_{name.replace(':', '_')}"
            cad_eval = evaluate("cad_base", best_single("cad")[1], best_single("cad")[0] == "tabpfn") if t != "cad" else None
            for exp in kept.exp:
                code = exp.split()[0]
                if code == "M4":
                    fp = JointPattern(model, patterns(df), t)
                elif code == "M2" and cad_eval is not None:
                    fp = Hierarchical(model, df[VESSELS].max(axis=1).values, cad_lookup=oof_lookup(eval_folds, cad_eval.oof))
                elif code == "M3":
                    fp = Stacked(model, [Upstream(u, wrap_lr(u), fstar(df, u), df[u].values) for u in TARGETS if u != t])
                else:
                    continue
                pool[f"strategy:{code}"] = (CVResult.load(t, f"v2s6_{tag}_{code}"), evaluate(f"strategy_{code}", fp, gpu))
    # AutoGluon finalists: r0-r1 screen + r2-r4 + r5-r9 runs from the AutoGluon env
    for k in (1, 2):
        parts = [OOF_DIR / t / f"ag2_finalist{k}_r2r3r4.npz", OOF_DIR / t / f"ag2_finalist{k}.npz"]
        fin = json.loads((ROOT / "data" / "interim" / "autogluon" / "finalists.json").read_text()).get(f"{t}:{k}")             if (ROOT / "data" / "interim" / "autogluon" / "finalists.json").exists() else None
        if fin and all(p.exists() for p in parts):
            screen = _combine(t, [f"ag2_{fin}_screen", f"ag2_finalist{k}_r2r3r4"], f"ag2_finalist{k}_r0-r4")
            pool[f"autogluon:{fin}"] = (screen, CVResult.load(t, f"ag2_finalist{k}"))
    return {k: v for k, v in pool.items() if v[1] is not None}


# ------------------------------------------------------------------------------------------- S7 ensembles
def _auc_rows(S: np.ndarray, y: np.ndarray) -> float:
    from sklearn.metrics import roc_auc_score

    return float(np.mean([roc_auc_score(y, row) for row in S]))


def ensemble_weights(method: str, S: dict, y: np.ndarray, rows: np.ndarray) -> dict:
    """Weights over candidates fitted on the r0-r4 OOF of `rows` (training patients of an outer fold only)."""
    from sklearn.linear_model import LogisticRegression

    from ml.strategies import logit

    names = list(S)
    auc = {n: _auc_rows(S[n][:, rows], y[rows]) for n in names}
    ranked = sorted(names, key=auc.get, reverse=True)
    if method == "best_single":
        return {ranked[0]: 1.0}
    if method in ("top3_mean", "top3_rank"):
        return {n: 1 / 3 for n in ranked[:3]}
    if method == "caruana":      # greedy selection with replacement, 25 rounds, starting from nothing
        counts, total = dict.fromkeys(names, 0), np.zeros_like(S[names[0]][:, rows])
        for _ in range(25):
            gain = {n: _auc_rows((total + S[n][:, rows]) / (sum(counts.values()) + 1), y[rows]) for n in names}
            best = max(gain, key=gain.get)
            counts[best] += 1
            total += S[best][:, rows]
        return {n: c / 25 for n, c in counts.items() if c}
    if method == "lr_stack":     # L2 logistic stacker on candidate logits (repeats stacked as rows), non-negative
        Z = np.column_stack([logit(S[n][:, rows].ravel()) for n in names])
        lr = LogisticRegression(C=0.3, max_iter=5000).fit(Z, np.tile(y[rows], S[names[0]].shape[0]))
        w = np.clip(lr.coef_[0], 0, None)
        return {n: float(wi) for n, wi in zip(names, w) if wi > 0} | {"__intercept__": float(lr.intercept_[0])}
    raise ValueError(method)


def ensemble_predict(method: str, weights: dict, preds: dict) -> np.ndarray:
    from scipy.stats import rankdata

    from ml.strategies import logit

    names = [n for n in weights if n != "__intercept__"]
    if method == "top3_rank":
        return np.mean([rankdata(preds[n]) / len(preds[n]) for n in names], axis=0)
    if method == "lr_stack":
        z = weights["__intercept__"] + sum(weights[n] * logit(preds[n]) for n in names)
        return 1 / (1 + np.exp(-z))
    return sum(weights[n] * preds[n] for n in names) / sum(weights[n] for n in names)


METHODS = ["best_single", "top3_mean", "top3_rank", "caruana", "lr_stack"]


def s7(df, _folds, targets):
    """S7 grand ensemble per label: weights fitted on r0-r4 OOF of each outer fold's training patients, scored on the
    r5-r9 test folds; compared with the best phase-3 model, untuned LR and default TabPFN on the same folds."""
    from ml.cv import load_folds
    from ml.evaluate import paired_compare
    from ml.strategies import oof_lookup, split_key

    out = V2 / "s7"
    out.mkdir(parents=True, exist_ok=True)
    eval_folds = load_folds(df)[[f"r{i}" for i in range(5, 10)]]
    rows = []
    for t in targets:
        y = df[t].values
        pool = candidate_pool(df, t, eval_folds, build_eval=True)
        S = {n: v[0].oof for n, v in pool.items()}
        looks = {n: oof_lookup(eval_folds, v[1].oof) for n, v in pool.items()}
        print(f"[{t}] pool: {list(pool)}", flush=True)
        for n, (sc, ev) in pool.items():
            rows.append({"target": t, "run": n, "kind": "candidate", "auc_r0r4": sc.summary["auc_mean"],
                         "auc_r5r9": ev.summary["auc_mean"]})
        results = {}
        for method in METHODS:
            def fp(X_tr, y_tr, X_te, tr, te, method=method):
                w = ensemble_weights(method, S, y, tr)
                return ensemble_predict(method, w, {n: looks[n][split_key(te)] for n in w if n != "__intercept__"})

            results[method] = run_cv(fp, df[["age"]], y, folds=eval_folds, name=f"v2s7_{method}", target=t, n_jobs=1,
                                     algo="ensemble", method=method, pool=list(pool), repeats="r5-r9")
        board = pd.read_csv(ROOT / "reports" / "phase3" / t / "leaderboard.csv")
        refs = {f"phase3:{board.iloc[0].model}": CVResult.load(t, board.iloc[0].run),
                "tabpfn_default_F2": CVResult.load(t, "tp2_tabpfn_F2")}
        lr_ref = OOF_DIR / t / "logreg_untuned_r5r9.npz"
        if lr_ref.exists():
            refs["logreg_untuned"] = CVResult.load(t, "logreg_untuned_r5r9")
        for method, res in results.items():
            r = {"target": t, "run": f"ensemble:{method}", "kind": "ensemble", "auc_r5r9": res.summary["auc_mean"],
                 "brier": res.summary["brier_mean"], "ece": res.summary["ece"], "accuracy": res.summary["accuracy_mean"],
                 "balanced_acc": res.summary["balanced_acc_mean"]}
            for rn, ref in refs.items():
                c = paired_compare(ref.fold_metrics, res.fold_metrics)
                r[f"vs_{rn}"], r[f"vs_{rn}_se"] = c["diff_mean"], c["diff_se"]
            rows.append(r)
            print(f"[{t}] ensemble {method}: auc {res.summary['auc_mean']:.4f} "
                  f"vs {list(refs)[0]} {r[f'vs_{list(refs)[0]}']:+.4f} (se {r[f'vs_{list(refs)[0]}_se']:.4f})", flush=True)
        save_decision(t, "ensemble", {"pool": list(pool), "weights_all": ensemble_weights("caruana", S, y, np.arange(len(y)))})
    pd.DataFrame(rows).to_csv(out / "s7_ensembles.csv", index=False, float_format="%.4f")


# ------------------------------------------------------------------------------------------- S8 post-processing
def _calibrator(kind: str, p: np.ndarray, y: np.ndarray):
    """Fit a calibration map on (scores, labels); returns f(scores) -> calibrated probabilities."""
    from sklearn.isotonic import IsotonicRegression
    from sklearn.linear_model import LogisticRegression

    from ml.strategies import logit

    if kind == "none":
        return lambda q: q
    if kind == "platt":
        m = LogisticRegression(C=1e6).fit(logit(p)[:, None], y)
        return lambda q: m.predict_proba(logit(q)[:, None])[:, 1]
    if kind == "temperature":     # single scale on the logit, no shift
        from scipy.optimize import minimize_scalar

        z = logit(p)
        T = minimize_scalar(lambda a: np.mean(np.logaddexp(0, -(2 * y - 1) * z / a)), bounds=(0.2, 5),
                            method="bounded").x
        return lambda q: 1 / (1 + np.exp(-logit(q) / T))
    if kind == "beta":            # Kull et al. 2017: logistic on [log p, -log(1 - p)]
        def feats(q):
            return np.column_stack([np.log(np.clip(q, 1e-4, 1)), -np.log(np.clip(1 - q, 1e-4, 1))])

        m = LogisticRegression(C=1e6).fit(feats(p), y)
        return lambda q: m.predict_proba(feats(q))[:, 1]
    if kind == "isotonic":
        m = IsotonicRegression(out_of_bounds="clip", y_min=1e-3, y_max=1 - 1e-3).fit(p, y)
        return m.predict
    raise ValueError(kind)


def _threshold(rule: str, p: np.ndarray, y: np.ndarray) -> float:
    from sklearn.metrics import roc_curve

    if rule == "0.5":
        return 0.5
    if rule == "youden":
        fpr, tpr, thr = roc_curve(y, p)
        return float(thr[np.argmax(tpr - fpr)])
    grid = np.unique(np.quantile(p, np.linspace(0.02, 0.98, 97)))
    if rule == "max_balanced_acc":
        score = [((p >= g)[y == 1].mean() + (p < g)[y == 0].mean()) / 2 for g in grid]
    elif rule == "max_f1":
        score = [2 * ((p >= g) & (y == 1)).sum() / max((p >= g).sum() + (y == 1).sum(), 1) for g in grid]
    else:
        raise ValueError(rule)
    return float(grid[int(np.argmax(score))])


CALIBRATORS = ["none", "platt", "temperature", "beta", "isotonic"]
THRESHOLDS = ["0.5", "youden", "max_balanced_acc", "max_f1"]


def s8(df, _folds, targets, method: str = "caruana", alpha: float = 0.1, champion: bool = False):
    """S8 on each label's S7 ensemble (or, with champion=True, on the S9 champion recorded in decisions.json): calibration (PP1), decision threshold (PP2), consistency P(vessel) <= P(CAD)
    (PP3) and split-conformal prediction sets (PP4). Everything is fitted per r5-r9 outer fold on the ensemble's r0-r4
    OOF of that fold's training patients (same weights as S7), then applied to the test patients."""
    from sklearn.metrics import brier_score_loss, f1_score, precision_score, recall_score, roc_auc_score

    from ml.cv import iter_splits, load_folds
    from ml.data import TARGETS
    from ml.evaluate import calibration
    from ml.strategies import oof_lookup, split_key

    out = V2 / ("s9" if champion else "s8")
    out.mkdir(parents=True, exist_ok=True)
    eval_folds = load_folds(df)[[f"r{i}" for i in range(5, 10)]]
    splits = list(iter_splits(eval_folds))
    calibrated, rows, conf_rows, thr_rows = {}, [], [], []
    for t in TARGETS:
        y = df[t].values
        pool = candidate_pool(df, t, eval_folds, build_eval=False)
        S = {n: v[0].oof for n, v in pool.items()}
        looks = {n: oof_lookup(eval_folds, v[1].oof) for n, v in pool.items()}
        m_t, opt = method, None
        if champion:
            opt = decisions()[t]["champion"]
            if opt.startswith("phase3:"):
                run = pd.read_csv(ROOT / "reports" / "phase3" / t / "leaderboard.csv").iloc[0].run
                S[opt] = CVResult.load(t, f"{run}_r0r4").oof
                looks[opt] = oof_lookup(eval_folds, CVResult.load(t, run).oof)
            m_t = opt.split(":", 1)[1] if opt.startswith("ensemble:") else None
        n_rep = S[next(iter(S))].shape[0]
        oof = {k: np.full((5, len(y)), np.nan) for k in CALIBRATORS}
        for r, f, tr, te in splits:
            train_y = np.tile(y[tr], n_rep)
            if m_t is None:                                     # single-model champion
                train_p, test_p = S[opt][:, tr].ravel(), looks[opt][split_key(te)]
            else:
                w = ensemble_weights(m_t, S, y, tr)
                members = [n for n in w if n != "__intercept__"]
                train_p = ensemble_predict(m_t, w, {n: S[n][:, tr].ravel() for n in members})
                test_p = ensemble_predict(m_t, w, {n: looks[n][split_key(te)] for n in members})
            for kind in CALIBRATORS:
                cal = _calibrator(kind, train_p, train_y)
                oof[kind][r, te] = cal(test_p)
            platt = _calibrator("platt", train_p, train_y)     # thresholds and conformal sets on the Platt scale
            cp_train, cp_test, y_te = platt(train_p), platt(test_p), y[te]
            for rule in THRESHOLDS:
                g = _threshold(rule, cp_train, train_y)
                pred = (cp_test >= g).astype(int)
                thr_rows.append({"target": t, "rule": rule, "threshold": g, "accuracy": (pred == y_te).mean(),
                                 "balanced_acc": (pred[y_te == 1].mean() + (1 - pred[y_te == 0]).mean()) / 2,
                                 "f1": f1_score(y_te, pred, zero_division=0),
                                 "precision": precision_score(y_te, pred, zero_division=0),
                                 "recall": recall_score(y_te, pred, zero_division=0)})
            score = np.where(train_y == 1, 1 - cp_train, cp_train)              # nonconformity = 1 - p(true label)
            level = min(1.0, np.ceil((len(score) + 1) * (1 - alpha)) / len(score))
            q = np.quantile(score, level, method="higher")
            sets = np.column_stack([cp_test <= q, 1 - cp_test <= q])              # is label 0 / label 1 in the set
            covered = sets[np.arange(len(te)), y_te]
            conf_rows.append({"target": t, "coverage": covered.mean(), "avg_set_size": sets.sum(1).mean(),
                              "singleton_rate": (sets.sum(1) == 1).mean(), "empty_rate": (sets.sum(1) == 0).mean()})
        for kind in CALIBRATORS:
            cal_stats = pd.DataFrame([calibration(y, row) for row in oof[kind]]).mean()
            rows.append({"target": t, "calibrator": kind, "auc": np.mean([roc_auc_score(y, row) for row in oof[kind]]),
                         "brier": np.mean([brier_score_loss(y, row) for row in oof[kind]]), **cal_stats.to_dict()})
        calibrated[t] = oof
        print(f"[{t}] calibration:\n{pd.DataFrame([x for x in rows if x['target'] == t]).round(4).to_string(index=False)}",
              flush=True)
    # PP3 consistency: a vessel cannot be more likely than CAD (each label Platt-calibrated)
    cons = []
    for v in VESSELS:
        y = df[v].values
        raw = calibrated[v]["platt"]
        for name, arr in (("platt", raw), ("platt+consistency", np.minimum(raw, calibrated["cad"]["platt"]))):
            cons.append({"target": v, "variant": name, "auc": np.mean([roc_auc_score(y, x) for x in arr]),
                         "brier": np.mean([brier_score_loss(y, x) for x in arr])})
    pd.DataFrame(rows).to_csv(out / f"{out.name}_calibration.csv", index=False, float_format="%.4f")
    thr = pd.DataFrame(thr_rows).groupby(["target", "rule"]).mean().reset_index()
    thr.to_csv(out / f"{out.name}_thresholds.csv", index=False, float_format="%.4f")
    conf = pd.DataFrame(conf_rows).groupby("target").mean().reset_index()
    conf.to_csv(out / f"{out.name}_conformal.csv", index=False, float_format="%.4f")
    pd.DataFrame(cons).to_csv(out / f"{out.name}_consistency.csv", index=False, float_format="%.4f")
    print(thr.round(4).to_string(index=False))
    print(conf.round(4).to_string(index=False))
    print(pd.DataFrame(cons).round(4).to_string(index=False))


# ------------------------------------------------------------------------------------------- S9 champion selection
def s9a(df, _folds, targets):
    """S9 champion choice on r0-r4 evidence only (r5-r9 stays the report). Every option gets the same 25 r0-r4 splits:
      * single candidates: their r0-r4 OOF;
      * ensembles: leave-one-repeat-out, i.e. weights fitted on the other four repeats' OOF of the split's training
        patients, applied to the held-out repeat's OOF of its test patients (mildly optimistic: those other-repeat OOF
        predictions come from models that trained on the test patients; noted in the report);
      * the phase-3 champion, re-scored on r0-r4 with its fixed tuned parameters.
    Paired differences vs the best option use the Nadeau-Bengio corrected SE."""
    from sklearn.metrics import roc_auc_score

    from ml.cv import iter_splits, load_folds, run_cv
    from ml.features import build
    from ml.models import make

    out = V2 / "s9"
    out.mkdir(parents=True, exist_ok=True)
    folds = load_folds(df)
    scr, eval_folds = folds[[f"r{i}" for i in range(5)]], folds[[f"r{i}" for i in range(5, 10)]]
    splits = list(iter_splits(scr))
    s7 = pd.read_csv(V2 / "s7" / "s7_ensembles.csv")
    f2_sets = json.loads((ROOT / "reports" / "phase2" / "f2_feature_sets.json").read_text())["f2"]
    rows = []
    for t in targets:
        y = df[t].values
        pool = candidate_pool(df, t, eval_folds, build_eval=False)
        S = {n: v[0].oof for n, v in pool.items()}
        per_split = {n: [roc_auc_score(y[te], S[n][r, te]) for r, f, tr, te in splits] for n in S}
        for method in METHODS:
            aucs = []
            for r, f, tr, te in splits:
                others = {n: np.delete(s, r, axis=0) for n, s in S.items()}
                w = ensemble_weights(method, others, y, tr)
                aucs.append(roc_auc_score(y[te], ensemble_predict(method, w, {n: S[n][r, te] for n in w
                                                                              if n != "__intercept__"})))
            per_split[f"ensemble:{method}"] = aucs
        board = pd.read_csv(ROOT / "reports" / "phase3" / t / "leaderboard.csv").iloc[0]
        params = json.loads((ROOT / "reports" / "phase3" / t / "best_params.json").read_text())[board.model]
        p3 = run_cv(make(board.model, params, n_seeds=5 if board.run.endswith("seedbag5") else 1),
                    build(df, **f2_sets[t]), y, folds=scr, name=f"{board.run}_r0r4", target=t, n_jobs=14,
                    algo=board.model, feature_set="F2", stage="s9_phase3_r0r4", repeats="r0-r4")
        per_split[f"phase3:{board.model}"] = [roc_auc_score(y[te], p3.oof[r, te]) for r, f, tr, te in splits]
        means = {n: float(np.mean(a)) for n, a in per_split.items()}
        best = max(means, key=means.get)
        n_te = np.mean([len(te) for *_, te in splits])
        for n, a in per_split.items():
            d = np.asarray(a) - np.asarray(per_split[best])
            se = float(np.sqrt(d.var(ddof=1) * (1 / len(d) + n_te / (len(y) - n_te))))
            r59 = s7[(s7.target == t) & (s7.run == n)].auc_r5r9
            rows.append({"target": t, "option": n, "auc_r0r4": means[n], "vs_best": d.mean(), "vs_best_se": se,
                         "within_1se": bool(d.mean() >= -se),
                         "auc_r5r9": float(r59.iloc[0]) if len(r59) else (board.auc if n.startswith("phase3") else np.nan)})
        save_decision(t, "champion", best)
        tbl = pd.DataFrame([x for x in rows if x["target"] == t]).sort_values("auc_r0r4", ascending=False)
        print(f"[{t}] r0-r4 ranking (best: {best}):\n{tbl.round(4).to_string(index=False)}", flush=True)
    pd.DataFrame(rows).to_csv(out / "s9_selection.csv", index=False, float_format="%.4f")


def s9c(df, _folds, targets):
    """S9 robustness of the exported champions on r5-r9: subgroup AUCs (sex, age band, diabetes), seed sensitivity
    (single-model champions refitted with two more seeds) and a learning curve (50 / 75 % of each training fold)."""
    from sklearn.metrics import roc_auc_score

    import ml.models
    from ml.cv import load_folds
    from ml.export import _champion_parts
    from ml.v2 import Subsample

    out = V2 / "s9"
    eval_folds = load_folds(df)[[f"r{i}" for i in range(5, 10)]]
    groups = {"male": df.sex_male == 1, "female": df.sex_male == 0, "age<50": df.age < 50,
              "age50-64": (df.age >= 50) & (df.age < 65), "age>=65": df.age >= 65, "diabetic": df.dm == 1,
              "non-diabetic": df.dm == 0}
    sub_rows, seed_rows, lc_rows = [], [], []
    for t in targets:
        y = df[t].values
        option = decisions()[t]["champion"]
        if option.startswith("phase3:"):
            run = pd.read_csv(ROOT / "reports" / "phase3" / t / "leaderboard.csv").iloc[0].run
        elif option.startswith("classical:"):
            run = f"v2e_classical_{option.split(':')[1]}"
        else:
            run = f"v2s7_{option.split(':')[1]}"
        oof = CVResult.load(t, run).oof
        for g, mask in groups.items():
            m = mask.values
            sub_rows.append({"target": t, "group": g, "n": int(m.sum()), "positives": int(y[m].sum()),
                             "auc": float(np.mean([roc_auc_score(y[m], row[m]) for row in oof]))
                             if 0 < y[m].sum() < m.sum() else np.nan})
        kind, spec, members, stack, _ = _champion_parts(df, t)
        if stack is not None:
            continue                                    # 8-member stack: seed noise averages out; not refitted
        from ml.export import ChampionModel

        X = ChampionModel(t, option, kind, spec, {}).features(df)
        base_seed = ml.models.SEED
        for k in (1, 2):
            ml.models.SEED = base_seed + k
            est = next(iter(_champion_parts(df, t)[2].values()))
            ml.models.SEED = base_seed
            res = run_cv(est, X, y, folds=eval_folds, name=f"v2s9_{t}_seed{k}", target=t, n_jobs=14,
                         algo=option, stage="s9_seed", repeats="r5-r9")
            seed_rows.append({"target": t, "seed": base_seed + k, "auc": res.summary["auc_mean"]})
        seed_rows.append({"target": t, "seed": base_seed, "auc": CVResult.load(t, run).summary["auc_mean"]})
        est = next(iter(members.values()))
        for frac in (0.5, 0.75):
            res = run_cv(Subsample(est, frac), X, y, folds=eval_folds, name=f"v2s9_{t}_lc{int(frac * 100)}",
                         target=t, n_jobs=14, algo=option, stage="s9_learning_curve", repeats="r5-r9")
            lc_rows.append({"target": t, "train_fraction": frac, "n_train": int(round(frac * len(y) * 0.8)),
                            "auc": res.summary["auc_mean"]})
        lc_rows.append({"target": t, "train_fraction": 1.0, "n_train": int(round(len(y) * 0.8)),
                        "auc": CVResult.load(t, run).summary["auc_mean"]})
    for name, rows in (("subgroups", sub_rows), ("seeds", seed_rows), ("learning_curve", lc_rows)):
        tbl = pd.DataFrame(rows)
        tbl.to_csv(out / f"s9_{name}.csv", index=False, float_format="%.4f")
        print(f"{name}:\n{tbl.round(4).to_string(index=False)}", flush=True)


def s9d(df, _folds, targets):
    """S9 final report table: each champion on r5-r9 (AUC with 95 % patient-bootstrap CI) and paired differences
    (Nadeau-Bengio corrected SE) against the phase-3 best, untuned LR on the raw 55 features, default TabPFN and the
    best AutoGluon pipeline, all on the same r5-r9 folds."""
    from ml.evaluate import bootstrap_ci, paired_compare

    rows = []
    for t in targets:
        y = df[t].values
        option = decisions()[t]["champion"]
        board = pd.read_csv(ROOT / "reports" / "phase3" / t / "leaderboard.csv").iloc[0]
        run = (board.run if option.startswith("phase3:") else f"v2e_classical_{option.split(':')[1]}"
               if option.startswith("classical:") else f"v2s7_{option.split(':')[1]}")
        champ = CVResult.load(t, run)
        ci = bootstrap_ci(y, champ.oof).loc["auc"]
        row = {"target": t, "champion": option, "auc_r5r9": champ.summary["auc_mean"],
               "auc_ci_low": float(ci.ci_low), "auc_ci_high": float(ci.ci_high)}
        refs = {"phase3_best": board.run, "untuned_lr_raw": "p2_logreg_F0", "tabpfn_default": "tp2_tabpfn_F2",
                "autogluon_best": "ag2_finalist1"}
        for name, ref_run in refs.items():
            if ref_run == run:
                row[f"{name}_auc"], row[f"vs_{name}"], row[f"vs_{name}_se"] = champ.summary["auc_mean"], 0.0, 0.0
                continue
            ref = CVResult.load(t, ref_run)
            c = paired_compare(ref.fold_metrics, champ.fold_metrics)
            row[f"{name}_auc"], row[f"vs_{name}"], row[f"vs_{name}_se"] = (ref.summary["auc_mean"], c["diff_mean"],
                                                                           c["diff_se"])
        rows.append(row)
    tbl = pd.DataFrame(rows)
    tbl.to_csv(V2 / "s9" / "s9_final.csv", index=False, float_format="%.4f")
    print(tbl.round(4).T.to_string(), flush=True)


def wrap_lr(t):
    """Phase-4 style upstream model for stacking: the label's re-tuned logistic regression (S3c)."""
    from ml.models import make
    from ml.v2 import wrap

    c = decisions()[t]["classical"]["logreg"]
    return wrap(t, make("logreg", c["params"]))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--stage", required=True, choices=["s1", "s2a", "s2b", "s3t", "s3c", "s6", "s7", "s8", "s9a", "s9b", "s9c", "s9d"])
    ap.add_argument("--targets", nargs="*", default=TARGETS, choices=TARGETS)
    args = ap.parse_args()
    df = load_clean()
    folds = load_folds(df)[SCREEN]
    {"s1": s1, "s2a": s2a, "s2b": s2b, "s3t": s3t, "s3c": s3c, "s6": s6, "s7": s7, "s8": s8, "s9a": s9a, "s9b": lambda d, f, t: s8(d, f, t, champion=True), "s9c": s9c, "s9d": s9d}[args.stage](df, folds, args.targets)


if __name__ == "__main__":
    main()
