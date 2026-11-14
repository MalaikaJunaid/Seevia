# Seevia

**Voice-first assistance for everyday independence.**

[![Stage: MVP pre-launch](https://img.shields.io/badge/Stage-MVP%20%7C%20Pre--launch-orange?style=for-the-badge)](#launch-readiness-and-investment)
[![React Native 0.72.10](https://img.shields.io/badge/React_Native-0.72.10-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](./package.json)
[![Expo SDK 49](https://img.shields.io/badge/Expo-SDK_49-000020?style=for-the-badge&logo=expo)](./package.json)
[![Five Hugging Face models](https://img.shields.io/badge/AI_Models-5-FFD21E?style=for-the-badge&logo=huggingface)](https://huggingface.co/malaikajunaid/models)
[![COMSATS Career Expo first prize](https://img.shields.io/badge/COMSATS_Career_Expo-1st_Prize-2EA44F?style=for-the-badge)](#recognition-incubation-and-team)
[![Startup incubation participant](https://img.shields.io/badge/Startup_Incubation-Participant-6f42c1?style=for-the-badge)](#recognition-incubation-and-team)
[![MIT License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](./LICENSE)

Seevia is a fully implemented, full-featured mobile assistive-technology product developed at COMSATS University Islamabad. It brings together voice interaction, accessible interfaces, computer vision, household management, shopping assistance, and connected safety workflows to support greater independence for people with visual impairments, with particular attention to Pakistani users and Roman Urdu interaction.

> **Product and launch status:** Seevia's application, core modules, and five AI models have been implemented as a complete product. The MVP designation is a cautious pre-launch label: it does not mean the product is only a mock-up or that its core modules are missing. Further investment and refinement are needed before a broad production launch, including expanded real-world validation, operational readiness, and continued product hardening. Safety features should not be treated as a replacement for established emergency services or a verified mobility aid.

[Download the Android app](https://drive.google.com/file/d/1OYgzkxyoVW4f8brqlXX6AsYmIO3_so9b/view?usp=sharing)

The shared build is intended for product evaluation. Contact the team for current release and deployment information.

## Who Seevia is for

- **People with visual impairments:** voice-first tools for household inventory, shopping, product information, and personal safety.
- **Caregivers and trusted contacts:** connected experiences for supporting a Seevia user and receiving shared information or alerts.
- **Volunteers:** community response workflows for offering assistance when requested.
- **Researchers, incubators, and development partners:** a deployed product foundation for accessibility, applied AI, and assistive-technology collaboration.

Seevia is designed around the needs of people in Pakistan, including spoken English and Roman Urdu interaction patterns. Continued engagement with people with visual impairments and local accessibility experts is an important part of refining the product and preparing it for wider use.

## Product modules

Seevia brings together the following implemented application modules:

- **Voice commands and conversational assistance:** speech input, intent recognition, spoken responses, and hands-free interaction, including English and Roman Urdu use cases.
- **Smart pantry:** household inventory tracking, product capture, expiry reminders, allergy and dietary information, and shopping-list support.
- **Product recognition and label understanding:** camera, barcode, and OCR workflows to help identify products and surface relevant information.
- **Shopping assistant:** shopping-list tools, store and aisle navigation features, and route-planning logic for in-store assistance.
- **Emergency safety and Safe Step:** SOS workflows, fall-detection services, location sharing, and trusted-contact support.
- **Caregiver and volunteer network:** user linking, caregiver support, and community volunteer response workflows.
- **Adaptive personalization:** preference and usage-pattern features that support more relevant reminders and suggestions.
- **Accessible interaction:** voice feedback, haptics, high-contrast options, and screen-reader-aware UI patterns.

As with any assistive product, recognition, location, and safety outputs can be affected by device conditions, connectivity, user settings, and the environment. Continue to verify critical information and maintain appropriate backup plans.

## AI models

Seevia includes five models that support its recognition, language, safety, and navigation capabilities. All five are published on the [Seevia Hugging Face models page](https://huggingface.co/malaikajunaid/models), so you can inspect or download individual model files without pulling every large model asset from this repository. The figures below are the project's reported evaluation results; performance can vary with hardware, data, and real-world conditions.

| Model | Purpose and approach | Reported evaluation | Deployment |
| --- | --- | --- | --- |
| Model | Purpose and approach | Reported evaluation | Deployment |
| --- | --- | --- | --- |
| [**Product recognizer**](https://huggingface.co/malaikajunaid/seevia-local-product-recognizer) | YOLOv8-Nano model for 23 Pakistani product classes, trained using a 5,722-image dataset. | 87.3% mAP@50, 72.1% mAP@50-95, and 91.0% reported real-world accuracy. | Quantized TFLite, reported as 6.2 MB. |
| [**Zero-shot product extractor**](https://huggingface.co/malaikajunaid/SEEVIA-ZEROSHOT-EXTRACTOR) | Multilingual DistilBERT token-classification model for extracting product-label information. | 88.1% overall F1; reported component metrics include 91.2% brand precision, 88.7% expiry recall, and 84.3% allergen F1. | FP16 TFLite, reported as 85 MB. |
| [**Intent classifier**](https://huggingface.co/malaikajunaid/seevia-intent-model-improved) | FastText embeddings with a CNN and dense softmax classifier for five bilingual intents. | 87.4% overall accuracy; reported accuracy is 85.1% for Roman Urdu and 84.6% for code-switched Hinglish. | Quantized TFLite. |
| [**Kinematic fall detector**](https://huggingface.co/malaikajunaid/seevia-fall-detector) | SVM and random-forest ensemble using motion data. | 95.8% overall accuracy, 94.3% fall recall, and a 4.2% false-alarm rate on phone-drop tests. | TFLite. |
| [**Aisle navigator**](https://huggingface.co/malaikajunaid/SEEVIA-AISLE-NAVIGATION-DQN) | Dueling Deep Q-Network trained on synthetic store layouts and turn penalties. | 87.2% navigation success, 1.8% collision rate, and 68% fewer unnecessary 90-degree turns in the reported evaluation. | ONNX-to-TFLite workflow. |

These metrics describe the model evaluations conducted for the project; they are not guarantees of accuracy or safety in every environment.

## How it works

Seevia combines on-device processing with connected services:

- **On-device AI:** local models support product recognition, intent understanding, fall analysis, and navigation-related workflows.
- **Cloud AI fallbacks:** configured providers such as Hugging Face, Google Vision, Gemini, and speech services can support tasks that require additional processing.
- **Application services:** Firebase Authentication, Firestore, and Storage support identity, user data, and connected experiences.
- **Mobile experience:** React Native and Expo provide app screens and access to device capabilities such as camera, microphone, location, motion sensors, notifications, and haptics.

The app is designed to use local and connected capabilities together. Availability of cloud-backed features depends on network access, provider configuration, and the user's device. Model assets are tracked with **Git LFS**, so a complete checkout can be large.

### Download only the models you need

The model table links to all five Hugging Face repositories. Use the skip-LFS clone steps under **Getting started** to avoid downloading every model, then download only the model artifacts you need from Hugging Face. To retrieve all assets from Git LFS instead, run `git lfs pull` from the repository directory.

### Three-tier AI pipeline

The AI architecture combines on-device inference with cloud fallbacks:

1. **On-device inference:** local models handle supported product, intent, motion, and navigation tasks, providing fast responses and offline capability for those workflows.
2. **Cloud language inference:** Hugging Face services support language and product-label tasks that benefit from additional multilingual processing.
3. **Higher-capability cloud services:** Google Cloud Vision and Gemini support more demanding image, OCR, and scene-understanding requests.

The app selects an available path based on the task and model result. Cloud tiers require network access and valid provider configuration; local capability remains important for offline-resilient use.

### Firebase and the Trust Circle

Firebase connects the user, caregiver, and volunteer experiences. The application's data model includes:

```text
/users/{Auth_UID}                       # User profile, accessibility settings, and preferences
  /pantryItems/{itemId}                 # Household inventory and expiry information
  /shoppingLists/{listId}               # Manual and generated shopping lists
  /ocrLogs/{logId}                      # OCR and recognition records
  /voiceHistory/{entryId}               # Voice queries and intent history
/trust_circle/{circleId}                # User-caregiver connection
/emergency_logs/{logId}                 # SOS events and related location data
/volunteers/{Auth_UID}                  # Volunteer profile and availability
/system_configs/app_settings            # Application configuration
```

Configure Firebase Security Rules for the deployment environment. User, health, voice, and location records are sensitive data and should only be collected and shared with appropriate consent and access controls.

## Getting started

### Prerequisites

- Node.js 18 or newer
- npm
- Git and Git LFS
- Android Studio or an Android device for native testing

The project also declares iOS and web targets, but their build and runtime behavior should be validated separately. Some native modules require an Expo development build; Expo Go compatibility is not guaranteed.

### Clone and install without downloading every model

```bash
git lfs install
GIT_LFS_SKIP_SMUDGE=1 git clone https://github.com/MalaikaJunaid/Seevia.git
cd Seevia
npm ci
```

For Windows PowerShell, set the skip-smudge option before cloning:

```powershell
git lfs install
$env:GIT_LFS_SKIP_SMUDGE = "1"
git clone https://github.com/MalaikaJunaid/Seevia.git
Remove-Item Env:GIT_LFS_SKIP_SMUDGE
cd Seevia
npm ci
```

The clone leaves LFS pointer files in model asset paths. Download only the needed artifacts from the model pages above. To retrieve all model assets from Git LFS instead, clone normally or run `git lfs pull` from the repository directory.

**Dependency note:** the current dependency declarations have a peer-version conflict between `@picovoice/porcupine-react-native` 4.x and React Native 0.72.10. As a temporary development workaround, `npm ci --legacy-peer-deps` may install the lockfile, but it bypasses npm's peer-dependency check; it does not resolve or validate that compatibility issue. Align and test the dependency versions as part of release preparation.

### Configure services

Create a `.env` file in the project root and add the Firebase values for your own Firebase project:

```dotenv
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

Optional integrations read these variables when the corresponding feature is used:

```dotenv
EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY=
EXPO_PUBLIC_GEMINI_API_KEY=
EXPO_PUBLIC_GROQ_API_KEY=
EXPO_PUBLIC_HUGGINGFACE_API_KEY=
EXPO_PUBLIC_DEEPGRAM_API_KEY=
EXPO_PUBLIC_OPENAI_API_KEY=
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=
```

Only configure providers you intend to use. Availability depends on provider accounts, API access, and network connectivity.

**Credential note:** Expo `EXPO_PUBLIC_*` values are included in the client app and must be treated as public. Do not put server secrets, private service credentials, or unrestricted API keys in the mobile bundle. Restrict client keys appropriately and put privileged operations behind a secured backend. Firebase client configuration is not a substitute for correctly configured Firebase Security Rules.

### Start the development server

```bash
npx expo start
```

Use the Expo development build or platform workflow appropriate for the native modules you are testing.

## Launch readiness and investment

Seevia is a full-fledged implemented app product. The MVP label is used as a **precaution for launch planning**, not as a description of missing core modules. Investment and focused refinement will help prepare the product for a broader production release, including:

- Continued accessibility and usability evaluation with people with visual impairments and local experts.
- Expanded model validation across devices, environments, languages, and real-world product data.
- Further reliability, performance, and platform compatibility testing for release builds.
- Operational investment in hosting, backend services, support, monitoring, and product maintenance.
- Ongoing review of privacy, consent, Firebase authorization rules, credential handling, and applicable requirements for personal, health, and location data.
- Continued safety evaluation of fall detection, SOS delivery, location sharing, and failure handling.

Seevia's safety and navigation tools are intended to support independence, not replace emergency services, caregivers, or established mobility aids. Production deployment should follow appropriate testing and operational readiness.

## Repository layout

```text
src/
  app/          Expo Router screens and route layouts
  assets/       Images, fonts, data, and model files
  components/   Shared and feature-specific UI components
  constants/    App settings, categories, and commands
  hooks/        React hooks for app features
  models/       Domain and data types
  navigation/   Navigation helpers and types
  screens/      Screen implementations
  services/     Firebase, AI, voice, pantry, shopping, and safety services
  theme/        Theme and accessibility tokens
  themes/       Additional theme definitions
  utils/        Shared utility functions
```

## Recognition, incubation, and team

Seevia was awarded **1st Prize in Artificial Intelligence FYP** at the **COMSATS Career Expo 2026**.

The project has also participated in a **startup incubation program**, supporting its development toward product growth and commercialization.

- **Malaika Junaid** ([GitHub](https://github.com/MalaikaJunaid), [Hugging Face](https://huggingface.co/malaikajunaid))
- **Syeda Aleeza Tahir**
- **Project Supervisor:** Dr. Samera Batool, Department of Computer Science, COMSATS University Islamabad

## Contributing and feedback

Feedback from people with visual impairments, caregivers, accessibility specialists, and developers is welcome. When reporting an issue, include the device and OS, the steps to reproduce it, and whether the feature was tested with demo data, Firebase, or an external provider. Please do not include personal, health, location, or credential data in public issue reports.
