import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyB-nJudlBuhlVClHpPJwVtJsW75jHab9Yg",
  authDomain: "bingo-71c67.firebaseapp.com",
  databaseURL: "https://bingo-71c67-default-rtdb.firebaseio.com",
  projectId: "bingo-71c67",
  storageBucket: "bingo-71c67.firebasestorage.app",
  messagingSenderId: "779819952079",
  appId: "1:779819952079:web:bf53bd30842bcc078f94ba",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
