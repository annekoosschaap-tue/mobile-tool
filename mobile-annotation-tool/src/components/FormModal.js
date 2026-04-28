import { useState } from "react";
import { supabase } from "./SupabaseClient";
import "./styles.css";

export default function FormModal({ onSubmit }) {
  const [formData, setFormData] = useState({
    firstName: "",
    initials: "",
    lastName: "",
    email: "",
    orcid: "",
    institution: "",
    yearsOfExperience: null,
    department: "",
    city: "",
    country: "",
    consent: false,
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // ✅ ORCID validation (basic format + checksum support for X)
  const isValidOrcid = (orcid) => {
    if (!orcid) return true; // optional field

    const regex = /^\d{4}-\d{4}-\d{4}-\d{4}$/;
    return regex.test(orcid);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.consent) {
      setErrorMsg("You must agree before submitting.");
      return;
    }

    if (!isValidOrcid(formData.orcid)) {
      setErrorMsg("Invalid ORCID format (expected XXXX-XXXX-XXXX-XXXX).");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    const newSubmission = {
      firstname: formData.firstName,
      initials: formData.initials,
      lastname: formData.lastName,
      email: formData.email,
      orcid: formData.orcid || null,
      yearsofexperience: formData.yearsOfExperience,
      institution: formData.institution,
      department: formData.department,
      city: formData.city,
      country: formData.country,
      consent: formData.consent,
    };

    // ✅ RETURN inserted row (important!)
    const { error } = await supabase
      .from("users")
      .insert([newSubmission]);

    setLoading(false);

    if (error) {
      console.error("Failed to save user", error);
      setErrorMsg("Submission failed. Please try again.");
      return;
    }

    // ✅ Pass user ID upward
    onSubmit("0");
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <header className="header">
          Publication Questionnaire
        </header>

       <form className="form" onSubmit={handleSubmit}>
        <div className="form-content">
          <h3>Personal Information</h3>

          <label>First Name</label>
          <input name="firstName" placeholder="John" onChange={handleChange} required />

          <label>Initials</label>
          <input name="initials" placeholder="J.D." onChange={handleChange} required />

          <label>Last Name</label>
          <input name="lastName" placeholder="Doe" onChange={handleChange} required />

          <label>Email</label>
          <input name="email" type="email" placeholder="john.doe@email.com" onChange={handleChange} required />

          <label>ORCID</label>
          <input name="orcid" placeholder="0000-0000-0000-0000" onChange={handleChange} />

          <h3>Professional Information</h3>

          <label>Years of Experience</label>
          <input name="yearsofexperience" placeholder="5" onChange={handleChange} />

          <label>Institution</label>
          <input name="institution" placeholder="Technical University of Eindhoven" onChange={handleChange} />

          <label>Department</label>
          <input name="department" placeholder="Electrical Engineering" onChange={handleChange} />

          <label>City</label>
          <input name="city" placeholder="Eindhoven" onChange={handleChange} />

          <label>Country</label>
          <input name="country" placeholder="The Netherlands" onChange={handleChange} />

          <label className="consent">
            <input type="checkbox" name="consent" onChange={handleChange} />
            <span>
              I agree to the publication terms and confirm that the information
              provided is accurate.
            </span>
          </label>

          {errorMsg && <p className="error">{errorMsg}</p>}
        </div>

        <div className="form-footer">
          <button 
            type="submit" 
            disabled={loading}
          >
            {loading ? "Submitting..." : "Submit"}
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}