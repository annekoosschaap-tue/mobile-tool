import './App.css';
import { useState } from 'react';
import FormModal from './components/FormModal';
import STLViewer from './components/STLViewer';
import TaskModal from './components/TaskModal';

function App() {
  const [step, setStep] = useState("form");
  const [userId, setUserId] = useState(null);

  return (
    <div className="App">

      {step === "form" && (
        <FormModal
          onSubmit={(id) => {
            setUserId(id);
            setStep("instructions");
          }}
        />
      )}

      {step === "instructions" && (
        <TaskModal
          onContinue={() => setStep("viewer")}
        />
      )}

      {step === "viewer" && (
        <STLViewer userId={userId} />
      )}

    </div>
  );
}

export default App;