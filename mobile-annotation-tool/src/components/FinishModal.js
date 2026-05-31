import { useEffect, useState } from 'react';
import { supabase } from "./SupabaseClient";

const NUMBER_OF_PATIENTS = parseInt(process.env.REACT_APP_NUMBER_OF_PATIENTS || 3);

function FinishModal({ userId, onSelectPatient }) {
  const [summary, setSummary] = useState([]);

  useEffect(() => {
    const fetchSummary = async () => {
      const { data } = await supabase
        .from("annotations")
        .select("patient_id")
        .eq("user_id", userId);

      const counts = {};
      data.forEach((d) => {
        counts[d.patient_id] = (counts[d.patient_id] || 0) + 1;
      });

      setSummary(Object.entries(counts));
    };

    fetchSummary();
  }, []);

  return (
    <div className="modal-overlay">
      <div className="modal">

        <header className="header">
          Overview
        </header>

        <div className="form-content">
        <h3>Finished</h3>

        <p>
          You have finished all cases. Thank you for participating!
        </p>

        <p>
          Below you will find an overview of all the number of saved working projections per case.
        </p>

        {summary.map(([patientId, count]) => (
          <div key={patientId}>
            <span>{patientId} — {count} annotations</span>
          </div>
        ))}
        </div>

        <div className="finish-actions">
          <button
            className="small-button"
            onClick={() => onSelectPatient(NUMBER_OF_PATIENTS - 1 )}
          >
            Go back
          </button>
        </div>

        <div className="form-footer">
        <button
          type="button"
          onClick={() => window.location.reload()} // or your "go back" handler
        >
          Finish
        </button>

      </div>

      </div>
    </div>
  );
}

export default FinishModal;