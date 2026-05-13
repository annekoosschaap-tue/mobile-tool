import './App.css';
import { useState } from 'react';
import FormModal from './components/FormModal';
import STLViewer from './components/STLViewer';
import TaskModal from './components/TaskModal';
import FinishModal from './components/FinishModal';

  
const PATIENTS = ["C0001", "C0002", "C0003", "C0004", "C0005"]; // TODO: Make this dynamic

const NUMBER_OF_PATIENTS = parseInt(process.env.REACT_APP_NUMBER_OF_PATIENTS || 3);


function App() {
  const [step, setStep] = useState("form");
  const [userId, setUserId] = useState(null);

  const [patientIndex, setPatientIndex] = useState(0);

  const currentPatient = PATIENTS[patientIndex];

  const nextPatient = () => {
    if (patientIndex + 1 >= NUMBER_OF_PATIENTS) {
      setStep("finish");
      return;
    }

    setPatientIndex((i) => i + 1);
  };

  const previousPatient = () => {
    setPatientIndex((i) => Math.max(0, i - 1));
  };

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
        <STLViewer
          userId={userId}
          patientId={currentPatient}
          onNext={nextPatient}
          onPrevious={previousPatient}
          isLast={patientIndex >= NUMBER_OF_PATIENTS - 1}
          isFirst={patientIndex === 0}
        />
      )}

      {step === "finish" && (
        <FinishModal
          userId={userId}
          onSelectPatient={(patientId) => {
            setPatientIndex(PATIENTS.indexOf(patientId));
            setStep("viewer");
          }}
        />
      )}

    </div>
  );
}

export default App;