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
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    const newValue = type === "checkbox" ? checked : value;

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    // Live validation
    let newErrors = { ...errors };

    if (name === "orcid") {
      if (value && !isValidOrcid(value)) {
        newErrors.orcid = "Invalid ORCID format (XXXX-XXXX-XXXX-XXXX)";
      } else {
        delete newErrors.orcid;
      }
    }

    if (name === "email") {
      if (!value.includes("@")) {
        newErrors.email = "Invalid email address";
      } else {
        delete newErrors.email;
      }
    }

    if (name === "yearsOfExperience") {
      if (value < 0) {
        newErrors.yearsOfExperience = "Must be ≥ 0";
      } else {
        delete newErrors.yearsOfExperience;
      }
    }

    setErrors(newErrors);
  };

  // ORCID validation (basic format + checksum support for X)
  const isValidOrcid = (orcid) => {
    if (!orcid) return true; // optional field

    const regex = /^\d{4}-\d{4}-\d{4}-[\dX]$/;
    return regex.test(orcid);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (Object.keys(errors).length > 0) {
      setErrorMsg("Please fix the highlighted fields.");
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

    const { error } = await supabase
      .from("users")
      .insert([newSubmission]);

    setLoading(false);

    if (error) {
      console.error("Failed to save user", error);
      setErrorMsg("Submission failed. Please try again.");
      return;
    }

    // Pass user ID upward #TODO: Make this a useful user_id
    const userId = "0";
    onSubmit(userId);
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
          {errors.email && <p className="error">{errors.email}</p>}

          <h3>Professional Information</h3>

          <label>Years of Experience</label>
          <input name="yearsofexperience" placeholder="5" onChange={handleChange} required/>
          {errors.yearsOfExperience && <p className="error">{errors.yearsOfExperience}</p>}

          <label>Institution</label>
          <input name="institution" placeholder="Technical University of Eindhoven" onChange={handleChange} required/>

          <label>Department</label>
          <input name="department" placeholder="Electrical Engineering" onChange={handleChange} required/>

          <label>City</label>
          <input name="city" placeholder="Eindhoven" onChange={handleChange} required/>

          <label>Country</label>
          <input name="country" placeholder="The Netherlands" onChange={handleChange} required/>
        
          <label>ORCID</label>
          <input name="orcid" placeholder="0000-0000-0000-0000" onChange={handleChange} />
          {errors.orcid && <p className="error">{errors.orcid}</p>}

          <label className="consent">
            <input 
              type="checkbox" 
              name="consent" 
              onChange={handleChange} 
              required
            />
            <span>
              I agree to the publication terms and confirm that the information
              provided is accurate.
            </span>
          </label>
          {errors.consent && <p className="error">{errors.consent}</p>}

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