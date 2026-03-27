# Synapse AI - AI Meeting Companion

## 📋 Overview
Synapse AI is an intelligent AI-powered meeting companion designed to enhance collaboration and productivity. It leverages advanced artificial intelligence to assist users during meetings by providing real-time insights, summarization, and intelligent recommendations.

## ✨ Features
- **Real-Time Meeting Transcription**: Automatically transcribe meeting conversations for accurate record-keeping
- **AI-Powered Insights**: Generate intelligent summaries and key takeaways from meetings
- **Smart Recommendations**: Receive actionable suggestions based on meeting content
- **PDF Document Processing**: Upload and analyze PDF documents during meetings
- **Responsive UI**: Beautiful and intuitive user interface built with React and Tailwind CSS
- **Gemini AI Integration**: Powered by Google's Gemini AI for advanced natural language processing

## 🛠 Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Backend**: Express.js, Node.js
- **AI/ML**: Google Gemini API (@google/genai)
- **Build Tools**: Vite, TypeScript
- **File Handling**: Multer, PDF-Parse
- **UI Components**: Lucide React Icons, Motion animations

## 📦 Project Structure
```
Synapse-AI-/
├── src/                 # Source code directory
├── server.ts            # Express server configuration
├── index.html           # HTML entry point
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
├── package.json         # Project dependencies
├── .env.example         # Environment variables template
└── metadata.json        # Project metadata
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager
- Gemini API Key from Google AI Studio

### Installation
1. **Clone the repository**:
   ```bash
   git clone https://github.com/udayputtireddi/Synapse-AI-.git
   cd Synapse-AI-
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   - Copy `.env.example` to `.env.local`
   - Add your Gemini API Key to the `.env.local` file:
     ```
     GEMINI_API_KEY=your_api_key_here
     APP_URL=http://localhost:5173
     ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Access the application**:
   - Open your browser and navigate to `http://localhost:5173`

## 📝 Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the project for production
- `npm start` - Start the production server
- `npm run preview` - Preview production build
- `npm run clean` - Clean the dist folder
- `npm run lint` - Run TypeScript type checking

## 🔧 Configuration

### Environment Variables
The project uses the following environment variables:

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Your Google Gemini API key for AI functionality |
| `APP_URL` | The URL where your app is hosted |

## 📚 Usage
1. Start the application using `npm run dev`
2. Upload or paste meeting content
3. Use the AI features to get summaries and insights
4. Download or share the generated reports

## 🤝 Contributing
Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a new branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

## 🙋 Support
For questions or issues, please open an issue on GitHub or contact the maintainer at [udayputtireddi](https://github.com/udayputtireddi)

## 🔗 Resources
- [Google Gemini API Documentation](https://ai.google.dev/docs)
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Express.js Documentation](https://expressjs.com)

---
**Created with ❤️ by Uday Puttireddi**