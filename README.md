# Lexical Editor Playground (React + Vite)

This project is a JavaScript implementation of the Lexical Editor playground using React and Vite. It provides a minimal setup to get React working in Vite with HMR (Hot Module Replacement) and some ESLint rules.

## Features

- React 18
- Vite for fast development and building
- Lexical Editor integration
- Hot Module Replacement (HMR)
- ESLint for code quality

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- Node.js (version 14.x or later recommended)
- npm (usually comes with Node.js)

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/lexical-editor-playground.git
   cd lexical-editor-playground
   ```

2. Install the dependencies:
   ```
   npm install
   ```

## Development

To start the development server:

```
npm run dev
```

This will start the Vite development server. Open your browser and navigate to `http://localhost:5173` to see the application running.

## Building for Production

To create a production build:

```
npm run build
```

This will generate optimized files in the `dist` directory.

## Linting

To run ESLint:

```
npm run lint
```

## Project Structure

- `src/` - Contains the source code for the application
  - `components/` - React components
  - `App.jsx` - Main application component
  - `main.jsx` - Entry point of the application
- `public/` - Static assets
- `vite.config.js` - Vite configuration file
- `package.json` - Project dependencies and scripts

## Vite Plugins

This project uses the following official Vite plugin:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) - Uses Babel for Fast Refresh

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgements

- [React](https://reactjs.org/)
- [Vite](https://vitejs.dev/)
- [Lexical](https://lexical.dev/)

## Support

If you encounter any issues or have questions, please file an issue on the GitHub repository.
```

This README provides a comprehensive overview of your Lexical Editor playground project using React and Vite. It includes sections on installation, development, building for production, project structure, and more. You can customize this further based on your specific project needs or additional features you may have implemented.