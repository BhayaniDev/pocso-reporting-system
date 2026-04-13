# 🛡️ POCSO Shield

**A Blockchain-Powered Anonymous Reporting Platform for Illegal Online Content**

> Developed for Hackathon — Problem Statement 11 | CyberTech Theme

---

## 📖 Overview of POCSO Shield

POCSO Shield is a secure platform that allows individuals to report illegal online content (such as CSAM) **without revealing their identity**. No login, email, or personal details are required — only a URL and a description.

### 🔄 What happens after a report is submitted?

1. An **AI model evaluates** the report and assigns a risk level:
   `CRITICAL / HIGH / SUSPICIOUS / LOW`

2. The **evidence is stored on IPFS**, ensuring decentralized, permanent, and tamper-resistant storage

3. A **hash of the report along with the AI score is recorded on the Polygon blockchain**, making it immutable and publicly verifiable

4. Reports marked as **high-risk (score ≥ 85)** are **automatically escalated by the smart contract**, preventing any manual suppression

5. **Authorities can access and review all reports** through a dashboard that includes full blockchain-based audit trails

Additionally, a **Chrome extension** alerts users in real-time if they visit websites flagged for illegal or harmful content

---

## 🏗️ System Architecture

The platform follows a structured flow:

* Users submit reports anonymously via the frontend
* Backend services process the request
* AI evaluates risk
* Evidence is stored on IPFS
* Blockchain stores proof of submission
* Smart contract enforces escalation rules
* Authorities monitor everything via a dashboard

A browser extension enhances safety by warning users during web browsing

---

## 📁 Project Organization

The project is divided into key modules:

* **Smart Contracts** → Core blockchain logic
* **Scripts** → Deployment utilities
* **Backend** → API, AI scoring, IPFS handling, blockchain interaction, and moderation logic
* **Frontend** → User interface for reporting and authority dashboard
* **Extension** → Chrome extension for real-time protection

Each module is designed to keep the system scalable, secure, and maintainable

---

## 🚀 Setup Guide (Beginner Friendly)

**Estimated Time:** 30–45 minutes
**Difficulty Level:** Easy (step-by-step)

---

### ✅ Requirements

Before starting, ensure you have:

* Node.js (v20 or higher)
* npm (v10 or higher)
* Git
* Chrome browser

---

### ⚙️ Installation Steps

### 1. Install Node.js

Download and install the latest LTS version from the official website and verify installation using terminal commands

---

### 2. Get the Project Files

Either extract the downloaded project or clone it using Git

---

### 3. Set Up Blockchain Access (Alchemy)

Create a free account, generate an API key, and connect to the Polygon Amoy test network

---

### 4. Create a Test Wallet (MetaMask)

* Set up a new wallet
* Add Polygon Amoy network
* Export private key
* Get free test tokens (MATIC) from faucet

---

### 5. Configure IPFS (Pinata)

Generate API keys to enable permanent file storage on IPFS

---

### 6. Get AI Token (HuggingFace)

Create an access token to enable AI-based risk scoring

---

### 7. Configure Environment Variables

Fill in required API keys and blockchain credentials in `.env` files

---

### 8. Deploy Smart Contract

* Install dependencies
* Compile the contract
* Deploy it to the Polygon network

---

### 9. Run Backend Server

Start the backend API and verify it using a health endpoint

---

### 10. Run Frontend Application

Launch the React app to access the user interface

---

### 11. Load Demo Data (Optional)

Populate the system with sample reports for testing and presentation

---

### 12. Install Chrome Extension (Optional)

Enable developer mode in Chrome and load the extension folder

---

## 🎬 Demo Workflow

1. Submit an anonymous report
2. Observe AI scoring and ZKP animation
3. View blockchain transaction proof
4. Check report in dashboard
5. Update report status
6. Review blockchain audit logs

---

## 🗝️ Key Highlights

* **Complete Anonymity** → No personal data required
* **Tamper-Proof System** → Blockchain ensures data integrity
* **Automated Escalation** → Critical reports cannot be ignored
* **Transparent Auditing** → Every action is traceable
* **AI + Blockchain Integration** → Instant analysis + permanent record
* **Secure Evidence Storage** → IPFS prevents data manipulation

---

## 🛠️ Common Issues & Fixes

* Missing contract → Compile and deploy again
* Transaction errors → Ensure sufficient test tokens
* API errors → Verify environment variables
* Port conflicts → Change ports in configuration

---

## 🧰 Technology Stack

* **Frontend:** React
* **Backend:** Node.js, Express
* **Blockchain:** Solidity, Hardhat, ethers.js
* **Network:** Polygon Amoy
* **Storage:** IPFS (via Pinata)
* **AI:** HuggingFace API
* **Extension:** Chrome Extension (Manifest v3)

---

## 👥 Team

Crafted with dedication for Hackathon PS11 — CyberTech Theme ❤️
