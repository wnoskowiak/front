import "./App.css";
import React from "react";
import AA from "./components/SendRequest";
import BB from "./components/MockEdit";
import CC from "./components/AimEdit";
import DD from "./components/History.js";

function App() {
  function CurrentView({ num }) {
    console.log(typeof num);
    if (num === "1") {
      return <AA />;
    }
    if (num === "2") {
      return <BB />;
    }
    if (num === "3") {
      return <CC />;
    }
    if (num === "4") {
      return <DD />;
    }
  }

  const [chosen, setChosen] = React.useState("1");

  function handleChange(event) {
    setChosen(event.target.value);
  }

  return (
    <div>
      <div>
        <select name="choice" onChange={handleChange}>
          <option value="1">wysyłanie requestów</option>
          <option value="2">tworzenie i edycja mocków</option>
          <option value="3">edycja konfiguracji</option>
          <option value="4">podgląd historii</option>
        </select>
        <hr />
      </div>
      <div>
        <CurrentView num={chosen} />
      </div>
    </div>
  );
}

export default App;
