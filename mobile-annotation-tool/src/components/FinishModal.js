import { useEffect, useState } from 'react';
import { supabase } from "./SupabaseClient";

function FinishModal({ userId, onSelectCase }) {
  const [summary, setSummary] = useState([]);

  useEffect(() => {
    const fetchSummary = async () => {
      const { data } = await supabase
        .from("annotations")
        .select("patient_id");

      const counts = {};
      data.forEach((d) => {
        counts[d.patient_id] = (counts[d.patient_id] || 0) + 1;
      });

      setSummary(Object.entries(counts));
    };

    fetchSummary();
  }, []);

  return (
    <div>
      <h2>Finished 🎉</h2>

      {summary.map(([patientId, count]) => (
        <div key={patientId}>
          <span>{patientId} — {count} annotations</span>
          <button onClick={() => onSelectCase(patientId)}>
            Annotate again
          </button>
        </div>
      ))}
    </div>
  );
}

export default FinishModal;