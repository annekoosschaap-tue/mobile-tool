import './App.css';
import { useEffect, useState } from "react";
import { supabase } from "./components/SupabaseClient";

import FormModal from './components/FormModal';
import STLViewer from './components/STLViewer';
import TaskModal from './components/TaskModal';
import FinishModal from './components/FinishModal';


const NUMBER_OF_PATIENTS = parseInt(process.env.REACT_APP_NUMBER_OF_PATIENTS || 3);

function App() {
  const TREATMENT_TYPE = process.env.REACT_APP_TREATMENT_TYPE;

  const TREATMENT_COLUMN_MAP = {
    "coiling": "coiling",
    "stent-assisted coiling": "stent_assisted_coiling",
    "flow diverter": "flow_diverter",
    "intrasaccular device": "intrasaccular_device",
  };

  const TREATMENT_COLUMN = TREATMENT_COLUMN_MAP[TREATMENT_TYPE];

  const [step, setStep] = useState("form");
  const [userId, setUserId] = useState(null);
  const [patientIndex, setPatientIndex] = useState(0);

  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(true);

  const currentPatient = patients[patientIndex];

  useEffect(() => {
    const fetchPatients = async () => {
      if (!TREATMENT_COLUMN) {
        console.error("Invalid treatment type:", TREATMENT_TYPE);
        return;
      }

      setLoadingPatients(true);

      const { data, error } = await supabase
        .from("patients")
        .select("id")
        .eq("coiling", true);

      if (error) {
        console.error("Error fetching patients:", error);
        setPatients([]);
      } else {
        setPatients(data.map((p) => p.id));
      }

      console.log(data)
      console.log(TREATMENT_COLUMN)
      console.log(TREATMENT_TYPE)

      setLoadingPatients(false);
    };

    fetchPatients();
  }, [TREATMENT_COLUMN]);

  if (loadingPatients) {
    return <div>Loading patients...</div>;
  }

  if (!patients.length) {
    return <div>No eligible patients for this treatment type.</div>;
  }

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
          patientIndex={patientIndex}
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
            setPatientIndex(patients.indexOf(patientId));
            setStep("viewer");
          }}
        />
      )}

    </div>
  );
}

export default App;