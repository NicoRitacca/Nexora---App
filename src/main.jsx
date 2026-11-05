import React from 'react'
import ReactDOM from 'react-dom/client'
import { Amplify } from 'aws-amplify'
import App from './App.jsx'
import './index.css'
import { amplifyOutputs } from './amplifyOutputs.js'

if (amplifyOutputs) Amplify.configure(amplifyOutputs)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
