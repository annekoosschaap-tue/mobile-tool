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
    percentOfAneurysms: null,
    department: "",
    city: "",
    country: "",
    consent: false,
    anonymous: false,
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
        newErrors.yearsOfExperience = "Must be 0 or more";
      } else {
        delete newErrors.yearsOfExperience;
      }
    }

    if (name === "percentOfAneurysms") {
      if (value < 0) {
        newErrors.percentOfAneurysms = "Must be between 0 and 100 percent";
      } else {
        delete newErrors.percentOfAneurysms;
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
      percentofaneurysms: formData.percentOfAneurysms,
      institution: formData.institution,
      department: formData.department,
      city: formData.city,
      country: formData.country,
      consent: formData.consent,
    };

    console.log(formData)

    const { data, error } = await supabase
      .from("users")
      .insert([newSubmission])
      .select("id")
      .single();

    if (error) {
      console.error("Failed to save user", error);
      setErrorMsg("Submission failed. Please try again.");
      setLoading(false);
      return;
    }

    const userId = data.id;

    console.log("User ID:", userId);

    setLoading(false);

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
          <h3>Experience</h3>

          <label>Years of experience</label>
          <input name="yearsofexperience" placeholder="5" onChange={handleChange} required/>
          {errors.yearsOfExperience && <p className="error">{errors.yearsOfExperience}</p>}

          <label>What percentage of your treatments involve cerebral aneurysms?</label>
          <input name="percentofaneurysms" placeholder="50" onChange={handleChange} required/>
          {errors.percentOfAneurysms && <p className="error">{errors.percentOfAneurysms}</p>}

          <label className="checkbox-label">
            <input 
              type="checkbox" 
              name="anonymous" 
              onChange={handleChange} 
            />
            <span>
              I wish to remain anonymous.
            </span>
          </label>

      {!formData.anonymous && (
        <>
          <h3>Personal Information</h3>

          <label>First name</label>
          <input name="firstName" placeholder="John" onChange={handleChange} required />

          <label>Initials</label>
          <input name="initials" placeholder="J.D." onChange={handleChange} required />

          <label>Last name</label>
          <input name="lastName" placeholder="Doe" onChange={handleChange} required />

          <label>Email</label>
          <input name="email" type="email" placeholder="john.doe@email.com" onChange={handleChange} required />
          {errors.email && <p className="error">{errors.email}</p>}

          <h3>Professional Information</h3>

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
        </>
      )}

          <label className="checkbox-label required">
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