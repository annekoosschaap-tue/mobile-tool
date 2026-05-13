export default function TaskModal({ onContinue }) {
  return (
    <div className="modal-overlay">
      <div className="modal">

        <header className="header">
          Task Instructions
        </header>

        <div className="form-content">
        <h3>Welcome</h3>

        <p>
          In the next step, you will interact with 3D vascular models from several patient cases. Each case contains one or more aneurysms.
        </p>

        <p>
          Your task is to select one or more viewing projections that you would use during an aneurysm coiling procedure. You can store multiple views, review them later, and delete or adjust them if needed. You may also return to previous patients at any time during the session.
        </p>

        <p>
          Click continue when you are ready to begin.
        </p>
        </div>

        <div className="form-footer">
          <button onClick={onContinue}>
            Continue
          </button>
        </div>

      </div>
    </div>
  );
}