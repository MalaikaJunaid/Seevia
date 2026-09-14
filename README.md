# Seevia: Voice-First Multimodal AI Ecosystem for Visually Impaired Autonomy
> 🏆 **Winner:** Awarded **1st Prize in Artificial Intelligence FYP** at the **COMSATS Career Expo 2026**.

**Seevia** is a voice-first, multimodal AI-powered mobile assistive platform developed at COMSATS University Islamabad to empower visually impaired persons (PWDs) to independently manage daily living, household inventories, retail navigation, and personal safety. Built to bridge the local accessibility gap in developing regions, Seevia eliminates dependence on human-in-the-loop subscriptions through an on-device, offline-resilient edge AI pipeline paired with a cloud fallback architecture.

---

## 🏗️ System Architecture & Cognitive Engine

Seevia operates on a **Three-Tier AI Fallback Architecture** designed for high availability and offline resilience on consumer-grade Android hardware:

```text
                  +------------------------------------------+
                  |   Input (Bilingual Audio / Video / IMU)  |
                  +------------------------------------------+
                                       |
                                       v
                  +------------------------------------------+
                  |       Tier 1: On-Device Edge (TFLite)    |
                  |   (YOLOv8-Nano, Anomaly SVM, FastText)   |
                  +------------------------------------------+
                                  /          \
                   Confidence >= 0.75      Confidence < 0.75
                                /              \
                               v                v
                 +--------------------+   +----------------------------+
                 | Voice Synthesizer  |   | Tier 2: Cloud Inference    |
                 | Direct TTS Output  |   | (HuggingFace Inference API)|
                 +--------------------+   +----------------------------+
                                                        |
                                           Confidence < 0.75 / Fail
                                                        |
                                                        v
                                          +----------------------------+
                                          | Tier 3: Reasoning Fallback |
                                          | (Google Vision API/Gemini) |
                                          +----------------------------+
                                                        |
                                                        v
                  +----------------------------------------------------+
                  |    Trust Circle: Firebase Real-Time Data Sync      |
                  |   (Firestore, FCM Dispatch, Storage, Twilio)       |
                  +----------------------------------------------------+

```

* **Tier 1 (On-Device Edge):** Quantized `.tflite` models execute locally with GPU/CPU delegate acceleration (<120 ms latency), providing offline functionality for vision, NLP, and kinematic fall classification.
* **Tier 2 (Cloud AI Models):** Hugging Face Inference APIs handle complex or ambiguous multilingual linguistic structures and secondary token classification.
* **Tier 3 (High-Reasoning Cloud Services):** Google Cloud Vision API and Gemini serve as the final fallback for heavily distorted text, non-standard local packaging fonts, or scene resolution.

---

## 🤖 Deployed AI Models & Empirical Evaluation

| Module / Model ID | Architecture | Dataset & Scope | Key Performance Metrics | Deployment Format |
| --- | --- | --- | --- | --- |
| **M-01: Product Recognizer** [`SEEVIA-LOCAL-PRODUCT-RECOGNIZER`](https://huggingface.co/malaikajunaid/seevia-local-product-recognizer) | YOLOv8-Nano | 5,722 images across 23 Pakistani product classes (Roboflow ACE & Image Recognition datasets)  | **87.3% mAP@50**, 72.1% mAP@50-95, 91.0% real-world accuracy, 80ms mobile GPU latency  | TFLite INT8 Quantized (6.2 MB)  |
| **M-02: ZeroShot Extractor** [`SEEVIA-ZEROSHOT-EXTRACTOR`](https://huggingface.co/malaikajunaid/SEEVIA-ZEROSHOT-EXTRACTOR) | DistilBERT Multilingual (`TokenClassification`) | Pakistani product labels annotated for Named Entity Recognition (NER)  | **88.1% Overall F1-Score** (91.2% Brand Precision, 88.7% Expiry Recall, 84.3% Allergen F1)  | TFLite FP16 (85 MB)  |
| **M-03: Intent Classifier** [`SEEVIA-INTENT-MODEL-IMPROVED`](https://huggingface.co/malaikajunaid/seevia-intent-model-improved) | FastText Embeddings + 2-Layer CNN + Dense Softmax  | 1,000+ bilingual utterances across 5 core intent classes (`navigate`, `scan_product`, `pantry`, `emergency`, `volunteer`)  | **87.4% Overall Accuracy** (85.1% Roman Urdu, 84.6% Code-switched Hinglish), <200 ms latency  | TFLite INT8  |
| **M-04: Kinematic Fall Detector** [`SEEVIA-FALL-DETECTOR`](https://huggingface.co/malaikajunaid/seevia-fall-detector) | Ensemble: SVM (RBF Kernel) + Random Forest (200 trees)  | SisFall Dataset (1,820 samples) + 240 custom phone-drop captures  | **95.8% Overall Accuracy**, 94.3% Fall Recall, **4.2% False Alarm Rate** on phone drops  | TFLite (<100 ms window at 50Hz)  |
| **M-05: Aisle Navigator** [`SEEVIA-AISLE-NAVIGATION-DQN`](https://huggingface.co/malaikajunaid/SEEVIA-AISLE-NAVIGATION-DQN) | Dueling Deep Q-Network (MLP: 256-128-64)  | 10,000 synthetic store topological layouts with turn penalties  | **87.2% Navigation Success Rate**, 1.8% collision rate, 68% reduction in unnecessary 90° turns | ONNX → TFLite  |

---

## 🧩 Core Ecosystem Modules

* **Voice Command & NLP Interface:** Real-time speech understanding handling natural codeswitched Roman Urdu and English (e.g., *"Doodh ki expiry kya hai?"* or *"Mujhe aisle 3 le jao"*).
* **Smart Pantry Management:** Automated household inventory tracking using camera recognition and Google ML Kit OCR. Automatically flags expiring items (<= 3 days), cross-references user allergen profiles, and auto-generates replenishment shopping lists.
* **In-Store Shopping Assistant:** Camera-based object detection matched with reinforcement learning-driven path planning to direct users through aisles while avoiding static and dynamic obstacles.
* **Emergency Safety Hub & Safe Step:** Kinematic fall detection running continuously at 50Hz. Falls trigger an audible/haptic 15-second cancellation window before auto-dispatching GPS coordinates to emergency contacts via Twilio SMS and Firebase Cloud Messaging (FCM).
* **Volunteer Response Network:** Community-based emergency response dispatching proximity-based alerts within a 5 km radius if primary caregivers do not acknowledge an SOS within 60 seconds.
* **Adaptive Personalization:** Behavioral preference modeling utilizing Markov-chain analysis to predict consumption habits and tailor proactive voice suggestions.

---

## 🗄️ Firestore Database & Security Rules

All entities are linked via Firebase Authentication `Auth_UID` with role-based access rules :

```text
/users/{Auth_UID}                        # Profile details, accessibility settings, health data, caregiver ID
  ├── /pantryItems/{itemId}              # Item metadata, expiration timestamps, Base64/Storage URLs
  ├── /shoppingLists/{listId}            # Auto-generated and manual shopping lists
  ├── /ocrLogs/{logId}                   # Raw OCR captures and model inference audit logs
  └── /voiceHistory/{id}                 # Transcribed queries, mapped intents, and latency metrics
/trust_circle/{circleId}                 # Bidirectional verification link between PWD and Caregiver
/emergency_logs/{logId}                  # Real-time SOS triggers, sensor telemetry, and GeoPoints
/volunteers/{Auth_UID}                   # Verified volunteer availability, rating, and location updates
/system_configs/app_settings             # Global runtime parameters (fallback thresholds, timeouts)

```

---

## 🛠️ Installation & Environment Setup

### Prerequisites

* **Node.js:** >= 18.x
* **Framework:** Expo CLI with EAS Build support 
* **Target Hardware:** Android device with minimum API Level 28 (Pie), rear camera, microphone, and IMU sensors 

### Installation Steps

1. **Clone the repository:**
```bash
git clone https://github.com/MalaikaJunaid/Seevia.git
cd Seevia

```


2. **Install dependencies:**
```bash
npm install

```


3. **Configure Environment Keys:**
Create a `.env` file in the project root:
```env
FIREBASE_API_KEY=your_firebase_key
FIREBASE_AUTH_DOMAIN=seevia-fypii.firebaseapp.com
FIREBASE_PROJECT_ID=seevia-fypii
FIREBASE_STORAGE_BUCKET=seevia-fypii.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
GOOGLE_VISION_API_KEY=your_vision_key
DEEPGRAM_API_KEY=your_deepgram_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_phone

```


4. **Start the Application:**
```bash
npx expo start

```



---

## 👥 Research & Development Team

* **Malaika Junaid** (CIIT/FA22-BAI-020/ISB) — *AI Lead & ML Engineer*  — [GitHub](https://github.com/MalaikaJunaid) | [Hugging Face](https://www.google.com/search?q=https://huggingface.co/malaikajunaid)
* **Syeda Aleeza Tahir** (CIIT/FA22-BAI-038/ISB) — *Lead System Architect & Full-Stack Developer* 
* **Project Supervisor:** **Dr. Samera Batool** — Department of Computer Science, COMSATS University Islamabad 
