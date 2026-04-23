import { useState } from "react";
import { supabase } from './SupabaseClient';
import "./styles.css";

export default function App() {
  const [formData, setFormData] = useState({
    firstName: "",
    initials: "",
    lastName: "",
    email: "",
    orcid: "",
    institution: "",
    department: "",
    city: "",
    country: "",
    consent: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.consent) {
      alert("You must agree before submitting.");
      return;
    }

    const newSubmission = {
      firstname: formData.firstName,
      initials: formData.initials,
      lastname: formData.lastName,
      email: formData.email,
      orchid: formData.orcid,
      institution: formData.institution,
      department: formData.department,
      city: formData.city,
      country: formData.country,
      consent: formData.consent,
    }

    const { error } = await supabase.from('users').insert(newSubmission);

    if (error) {
      console.error("Failed to save user", error);
    } else {
      alert("Submitted successfully!");
    }
  };

  return (
    <div className="app">
      <header className="header">
        Publication Questionnaire
      </header>

      <form className="form-content" onSubmit={handleSubmit}>
        <h3>Personal Information</h3>

        <input name="firstName" placeholder="First Name" onChange={handleChange} required />
        <input name="initials" placeholder="Initials" onChange={handleChange} required />
        <input name="lastName" placeholder="Last Name" onChange={handleChange} required />
        <input name="email" type="email" placeholder="Email" onChange={handleChange} required />
        <input name="orcid" placeholder="16-digit ORCID" onChange={handleChange} />

        <h3>Professional Information</h3>

        <input name="institution" placeholder="Institution" onChange={handleChange} />
        <input name="department" placeholder="Department" onChange={handleChange} />
        <input name="city" placeholder="City" onChange={handleChange}/>
        <input name="country" placeholder="Country" onChange={handleChange}/>

        <label className="consent">
            <input
                type="checkbox"
                name="consent"
                onChange={handleChange}
            />
            <span>
                I agree to the publication terms and confirm that the information
                provided is accurate.
            </span>
        </label>

        <button type="submit" className="submit-btn">
          Submit
        </button>
      </form>
    </div>
  );
}
