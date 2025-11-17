# 🎓 Drug Authenticity Verification System - College Project

**A modern web application to verify pharmaceutical drug authenticity using QR codes, barcodes, and supply chain tracking.**

![React](https://img.shields.io/badge/React-18.2.0-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)
![Status](https://img.shields.io/badge/Status-Ready%20for%20Demo-brightgreen.svg)

## 🌟 Project Overview

This is a full-stack web application that helps verify the authenticity of pharmaceutical drugs to combat counterfeit medications. The system uses modern web technologies and simulates real-world drug verification processes.

## 🚀 Quick Setup (5 Minutes)

### Prerequisites
- Node.js (Download from: https://nodejs.org/)

### Installation

1. **Clone/Download the project**
2. **Backend Setup:**
   ```bash
   cd drug/backend
   npm install
   npm start
   ```
   ✅ Backend runs on: http://localhost:3001

3. **Frontend Setup (New Terminal):**
   ```bash
   cd drug/frontend
   npm install
   npm start
   ```
   ✅ Frontend opens at: http://localhost:3000

## 🔐 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@drugverify.com | admin123 |
| Pharmacist | pharmacist@example.com | pharm123 |
| User | user@example.com | user123 |

## 🎯 Key Features Implemented

### ✅ User Authentication
- Secure login/registration system
- Role-based access control (Admin, Pharmacist, User)
- JWT token simulation

### ✅ Drug Verification
- QR Code scanning simulation
- Barcode verification
- Manual drug information entry
- Real-time authenticity checking

### ✅ Supply Chain Tracking
- Blockchain-like transaction history
- Track drugs from manufacturer to retailer
- Immutable ledger simulation

### ✅ Counterfeit Reporting
- Report suspicious drugs
- Evidence photo uploads
- Investigation workflow
- Status tracking

### ✅ Admin Dashboard
- User management
- System statistics
- Drug database management
- Report monitoring

### ✅ Modern UI/UX
- Responsive design (mobile-friendly)
- Professional interface
- Real-time feedback
- Accessibility features

## 🛠 Technology Stack

### Frontend
- **React.js 18** - Modern JavaScript framework
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Smooth animations
- **React Router** - Client-side routing
- **Local Storage** - Data persistence

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **CORS** - Cross-origin resource sharing
- **In-memory storage** - Simplified data management

## 📊 Sample Test Data

### Drug Verification:
- **Batch:** BATCH001, **Code:** PARA500 (Paracetamol)
- **Batch:** BATCH002, **Code:** AMOX250 (Amoxicillin)
- **QR Code:** QR001PARA500BATCH001
- **Barcode:** 123456789012

## 🎥 Demo Flow

1. **Login** with admin account
2. **Verify a drug** using sample data
3. **View supply chain** history
4. **Create a report** for counterfeit drug
5. **Check admin dashboard** for statistics
6. **Show responsive design** on mobile

## 📁 Project Structure

```
drug/
├── backend/
│   ├── simple-server.js    # Main server (No database!)
│   └── package.json        # Dependencies
├── frontend/
│   ├── src/
│   │   ├── pages/          # All application pages
│   │   ├── components/     # Reusable UI components
│   │   ├── contexts/       # State management
│   │   └── services/       # Data handling
│   └── package.json        # Dependencies
└── README-COLLEGE.md       # This file
```

## 🔧 Troubleshooting

### Common Issues:
- **Port in use:** Kill processes on ports 3000/3001
- **White screen:** Ensure both servers are running
- **Login fails:** Use exact demo credentials

### Solutions:
```bash
# Kill ports if needed
npx kill-port 3000
npx kill-port 3001

# Reinstall if issues
rm -rf node_modules package-lock.json
npm install
```

## 🏆 Academic Requirements Met

### Technical Requirements:
- ✅ Full-stack web development
- ✅ Modern JavaScript (ES6+)
- ✅ RESTful API design
- ✅ Responsive web design
- ✅ User authentication
- ✅ Data management
- ✅ Professional UI/UX

### Project Complexity:
- ✅ Multiple user roles
- ✅ Real-time features
- ✅ File upload handling
- ✅ State management
- ✅ API integration
- ✅ Security considerations

### Documentation:
- ✅ Complete setup instructions
- ✅ API documentation
- ✅ User guides
- ✅ Technical architecture

## 📈 Future Enhancements

- Real database integration (PostgreSQL/MongoDB)
- Actual blockchain implementation
- Camera-based QR scanning
- Push notifications
- Advanced analytics
- Mobile app development
- Machine learning for fraud detection

## 📞 Support

For questions or issues:
- Check the SETUP.md file for detailed instructions
- Verify all demo credentials are correct
- Ensure Node.js is properly installed
- Make sure both servers are running

## 🎓 Presentation Tips

1. **Start with the problem:** Counterfeit drugs are dangerous
2. **Show the solution:** Modern web app for verification
3. **Demo key features:** Login → Verify → Report → Admin
4. **Highlight technology:** React + Node.js + Modern UI
5. **Explain benefits:** Safety, traceability, user-friendly

## 📄 License

This is a college project for educational purposes.

---

**Built with ❤️ using modern web technologies**
*Ready for presentation and demonstration*