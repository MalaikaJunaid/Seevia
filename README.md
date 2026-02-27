# Seevia: AI-Driven Assistive Perception & Autonomous Navigation

[![Status](https://img.shields.io/badge/Status-In--Development-orange?style=flat-square)]()
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)]()
[![Framework](https://img.shields.io/badge/Framework-React--Native-61DAFB?style=flat-square&logo=react)]()
[![Stack](https://img.shields.io/badge/Stack-PyTorch--TensorFlow--FastAPI-EE4C2C?style=flat-square)]()

**Seevia** is a multimodal AI ecosystem designed to empower visually impaired individuals through structured scene understanding and adaptive indoor navigation. By bridging the gap between Computer Vision and Sequential Decision Making, Seevia provides a "voice-first" interface to manage personal inventory and navigate dynamic retail environments.

---

## 🏗️ System Dimensions

### 1. Personal Inventory & Autonomous Shopping
A closed-loop system for managing household essentials and optimizing the shopping experience.
* **Pantry Manager:** Uses predictive modeling to track usage frequency and expiry.
* **Shopping Assistant:** Employs **Reinforcement Learning (RL)** to optimize navigation paths in unmapped store layouts.

### 2. Assistive Perception Engine
A real-time sensory layer focused on environment interpretation and user safety.
* **Scene Understanding:** **CNN-based** object detection and specialized **OCR** for product identification.
* **Anomaly Detection:** Sensor-fusion AI to detect falls, disorientation, or unusual inactivity.

---

## 🧩 Core Modules

| Module | Technical Implementation |
| :--- | :--- |
| **1. AI Personalization** | Behavioral pattern analysis & ML-based user profiling. |
| **2. NLP Interface** | Intent Detection & Speech-to-Text (STT) for natural voice commands. |
| **3. Pantry Management** | OCR + classification models for automated inventory tracking. |
| **4. Shopping Assistant** | RL-driven path optimization and similarity-based product retrieval. |
| **5. Emergency Systems** | Motion sensor AI for real-time fall and danger detection. |
| **6. Volunteer Matching** | Location-based optimization models for human-in-the-loop support. |

---

## 🔬 Research Focus
* **Generalization:** Implementing an "Imagine-to-See" strategy for Zero-Shot navigation in novel indoor settings.
* **Edge AI:** Optimizing deep learning models via **TensorFlow Lite** for low-latency, on-device mobile inference.
* **Data Robustness:** Training on a custom-curated dataset of regional retail products and diverse indoor conditions.

---

## 🛠️ Installation & Setup (WIP)
Currently being built with **React Native** and **Expo**.

```bash
# Clone the repository
git clone [https://github.com/malaikajunaid/Seevia.git](https://github.com/malaikajunaid/Seevia.git)

# Install dependencies
npm install
```

---

## 📅 Project Roadmap & Progress Tracking

> This section tracks the daily development and research milestones for the Seevia ecosystem.

### Phase 1: Perception & Core Logic (Current Focus)
- [x] Functional Requirements & Mockup-based Analysis.
- [ ] **Research:** Literature review on Zero-Shot Indoor Navigation.
- [ ] **Module 2 & 5:** Implement on-device Intent Detection and Motion Sensor calibration.
- [ ] **Module 3:** Dataset curation for local retail products.
- [ ] **Vision:** Fine-tuning OCR engines for regional product packaging.

### Phase 2: Intelligence & Navigation
- [ ] **Module 4:** Designing the Deep Q-Network (DQN) for store navigation logic.
- [ ] **RL Agent:** Implementation of "Imagine-and-Align" strategy for zero-shot mapping.
- [ ] **Module 1:** User profiling and behavioral feedback loop integration.

### Phase 3: Deployment & Validation
- [ ] **Optimization:** Model quantization for `.tflite` mobile inference.
- [ ] **Module 6:** Real-time volunteer matching via Firebase Geofencing.
- [ ] **UAT:** User Acceptance Testing with voice-first UI protocols.
- [ ] **Publication:** Finalize research paper for workshop submission.
