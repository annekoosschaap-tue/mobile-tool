const NUMBER_OF_PATIENTS = parseInt(process.env.REACT_APP_NUMBER_OF_PATIENTS || 3);
const NUMBER_OF_PROJECTIONS = parseInt(process.env.REACT_APP_NUMBER_OF_ANNOTATIONS || 2);

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
          In the next step, you will explore 3D vascular models from {NUMBER_OF_PATIENTS} patient cases, each containing one or more aneurysms.
        </p>

        <p>
          Your task is to select at least {NUMBER_OF_PROJECTIONS} working projections for the highlighted aneurysm that you would use during a monoplane aneurysm coiling procedure. You do not need to consider C-arm physical constraints such as collision risks or unreachable positions.
        </p>

        <p>
          You can save multiple projections, review them later, and edit or delete them at any time. You may also return to previous patient cases during the session.
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