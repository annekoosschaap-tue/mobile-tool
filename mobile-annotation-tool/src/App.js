import './App.css';
import { useEffect, useState } from "react";
import { supabase } from "./components/SupabaseClient";

import FormModal from './components/FormModal';
import STLViewer from './components/STLViewer';
import TaskModal from './components/TaskModal';
import FinishModal from './components/FinishModal';


const NUMBER_OF_PATIENTS = parseInt(process.env.REACT_APP_NUMBER_OF_PATIENTS || 3);

function App() {

  const TREATMENT_TEXT_MAP = {
    "coiling": "coiling",
    "stent_assisted_coiling": "stent-assisted coiling",
    "flow_diverter": "flow diverter",
    "intrasaccular_device": "intrasaccular device",
  };

  const [step, setStep] = useState("form");
  const [userId, setUserId] = useState(null);
  const [treatmentType, setTreatmentType] = useState(null);
  const [patientIndex, setPatientIndex] = useState(0);

  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(true);

  const currentPatient = patients[patientIndex];

  const TREATMENT_TEXT = treatmentType
  ? TREATMENT_TEXT_MAP[treatmentType]
  : null;

  useEffect(() => {
    async function loadTreatmentType() {
      const { data, error } = await supabase
        .rpc("count_users_by_treatment_type");

      if (error) {
        console.error("Error counting treatment types:", error);
        return;
      }

      setTreatmentType(data[0].treatment_type);
    }

    loadTreatmentType();
  }, []);

  useEffect(() => {
    const fetchPatients = async () => {
      if (!TREATMENT_TEXT) {
        console.error("Invalid treatment type:", treatmentType);
        return;
      }

      setLoadingPatients(true);

      const { data, error } = await supabase
        .rpc("get_patients_by_annotation_count", {
          p_treatment_type: treatmentType,
        });

      if (error) {
        console.error(error);
      } else {
        setPatients(data.map((p) => p.patient_id));
      }

      console.log(patients)

      setLoadingPatients(false);
    };

    fetchPatients();
  }, [treatmentType]);

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
          treatmentTypeText={TREATMENT_TEXT}
          treatmentType={treatmentType}
          onSubmit={(id) => {
            setUserId(id);
            setStep("instructions");
          }}
        />
      )}

      {step === "instructions" && (
        <TaskModal
          treatmentType={TREATMENT_TEXT}
          onContinue={() => setStep("viewer")}
        />
      )}

      {step === "viewer" && (
        <STLViewer
          userId={userId}
          patientId={currentPatient}
          patientIndex={patientIndex}
          treatmentType={treatmentType}
          onNext={nextPatient}
          onPrevious={previousPatient}
          isLast={patientIndex >= NUMBER_OF_PATIENTS - 1}
          isFirst={patientIndex === 0}
        />
      )}

      {step === "finish" && (
        <FinishModal
          userId={userId}
          onSelectPatient={(patientIndex) => {
            setPatientIndex(patientIndex);
            setStep("viewer");
          }}
        />
      )}

    </div>
  );
}

export default App;