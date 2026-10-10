Multimodal AI Hackathon 2026 

Track A: Cardiovascular Risk Visualization & Prediction 

**Quick Medical Primer for Developers** 

The following concepts provide the domain context needed to understand the tasks. 

● **Coronary Artery Disease (CAD) & Stenosis:** Coronary arteries supply blood to the heart muscle. **Stenosis** refers to narrowing of a coronary artery, typically caused by plaque buildup. In the provided dataset, CAD is associated with at least 50% narrowing of one or more of the major coronary vessels. 

● **The Three Target Vessels:** The primary vessel-level targets are: 

○ **LAD (Left Anterior Descending):** Supplies blood to the front of the heart. ○ **LCX (Left Circumflex):** Supplies blood to the side and back of the heart. ○ **RCA (Right Coronary Artery):** Supplies blood to the right side and bottom of the heart. 

○ ML Goal: Train models to predict overall CAD status and the stenosis status of the LAD, LCX, and RCA using the available clinical features. 

● **Overall CAD Status:** The dataset provides an overall CAD classification in addition to the individual vessel labels. A patient may have significant stenosis in one or more of the target vessels, while the overall CAD label represents the presence or absence of CAD according to the dataset definition. 

● **Clinical and ECG Features:** The dataset contains demographic, clinical examination, laboratory, ECG, and echocardiographic features, including measurements such as age, blood pressure, pulse rate, cholesterol, cardiac enzymes, ST Elevation, T Inversion, LVH, and Region with RWMA. These features are provided as inputs to the prediction models and should not be treated as direct anatomical coordinates. 

● **Regional Wall Motion Abnormality (RWMA):** Region with RWMA is an echocardiographic finding indicating an abnormality in the motion of a region of the heart wall. It can be used as a clinical feature by the model, but it does **not** provide a direct pixel-level or 3D anatomical lesion map in this dataset. 

**Challenge:** Build an interactive 3D visualization system that predicts coronary artery disease and overall cardiac risk from patient physiological and clinical data, mapping predictions onto an interactive 3D human anatomical model.  
**Context:** 

Cardiovascular disease remains a leading cause of death globally. While statistical algorithms can generate risk percentages, raw numbers fail to give clinicians or patients an intuitive understanding of where and how pathology is developing inside the body. 

**Requirements:** 

**1\. Predictive Modeling:** 

a. Train classification models to predict overall CAD status. 

b. Predict stenosis status for the LAD, LCX, and RCA. 

c. Use demographic, clinical examination, ECG, laboratory, and echocardiographic features available in the dataset. 

d. Exclude LAD, LCX, RCA, and Cath from model input features when predicting CAD or vessel-specific stenosis to prevent target leakage. 

e. Evaluate predictions using appropriate classification metrics (accuracy, precision, recall, F1-score, ROC-AUC). 

**2\. 3D Visual Mapping:** 

a. Render an interactive 3D human torso/heart model (using Three.js, WebGL, React Three Fiber, or VTK.js). 

b. Dynamically update the color-code of individual coronary artery nodes (LAD, LCX, RCA) based on predicted stenosis probabilities. 

c. Allow users to rotate, zoom, and select anatomical regions to inspect localized/vessel-specific risk detail. 

**3\. Clinical Dashboard:** 

a. Display the predicted overall CAD status and vessel-specific stenosis probabilities alongside the 3D visualization canvas. 

b. Provide an interpretable breakdown of why the model predicted a given risk score (e.g., using SHAP values or LIME). 

c. Display physiological measurements alongside their relative contribution to the overall prediction. 

**4\. 3D models:** 

a. You may use open-source mesh anatomical files (.obj/.gltf) for rendering human anatomy. 

5\. **Clinical Safety Disclaimer**: The UI must include clear, visible visual disclaimers indicating that predictions are for decision support / educational purposes only and not a substitute for formal diagnostic imaging.  
**Expected Deliverables:** 

● **Working Software Prototype:** A web-based application featuring the interactive 3D viewer integrated with the ML model backend. 

● **Trained Prediction Pipeline:** Clean code and model weights for cardiac risk and multi-vessel stenosis classification. 

● **Clinical Explanation Dashboard:** Interactive display showing prediction metrics, feature importances (SHAP/LIME), and patient physiological breakdowns. ● **Project Documentation:** Overview of dataset preprocessing, model architecture, 3D pipeline setup, usage instructions, and evaluation results (max. 6 pages). ● **Demonstration Video:** A 3-10 minute youtube video demonstrating the working system, feature input workflow, 3D visualization interactions, and technical implementation. 

**Technical Considerations:** 

● The system should maintain responsive 3D interaction in modern web browsers without requiring dedicated GPUs. 

● The application architecture should support the addition of clinical features, prediction models, or anatomical structures without requiring a complete redesign. 

● The visualization should maintain a consistent correspondence between model outputs and the displayed LAD, LCX, and RCA anatomical structures. 

**Evaluation Criteria:** 

● **Predictive Performance (30%):** Classification performance, risk estimation quality, validation methodology 

● **3D Visualization (25%):** Anatomical representation, spatial risk mapping, interactive visualization 

● Clinical Interpretability (20%): Feature attribution quality, clarity of risk explanation, physiological factor breakdown 

● **System Integration (15%):** Data pipeline, model-dashboard integration, real-time visualization updates 

● **Technical Implementation (10%):** Architecture, code quality, reproducibility, use of public datasets and anatomical resources  
**Suggested Primary Dataset & Starter Resources** 

● **Primary Dataset:** UCI Machine Learning Repository: Extension of Z-Alizadeh Sani Dataset (also available on Kaggle). 

○ **Features:** 303 patient records containing demographics, vital signs, lab values, and echo findings. 

○ **Ground-Truth Target Labels:** Specific vessel stenosis status for the **LAD** (Left Anterior Descending), **LCX** (Left Circumflex), and **RCA** (Right Coronary Artery), alongside overall Coronary Artery Disease (CAD) classification. 

● **Anatomical 3D Mesh Resources:** 

○ BodyParts3D (Database Center for Life Science) 

○ Open-source .gltf / .glb / .obj heart models (e.g., via Sketchfab, Three.js repositories, or NIH 3D Print Exchange).