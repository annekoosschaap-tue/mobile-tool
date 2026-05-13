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
            In the next step, you will interact with a 3D model.
            Your task is to carefully inspect the structure and perform
            the required annotation.
          </p>

          <h3>Instructions</h3>

          <ul>
            <li>Rotate and inspect the 3D model</li>
            <li>Follow the annotation guidelines</li>
            <li>Take your time — accuracy is important</li>
          </ul>

          <p>
            Click continue when you are ready to start.
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