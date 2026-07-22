"use client";
import React, { useState } from "react";
import Dashboard from "./Dashboard.jsx";


export function AuthenticatedView({ userProfile, onLogout }) {
  const [currentView, setCurrentView] = useState("landing"); // Possible views: 'landing', 'onboarding', 'payment', 'dashboard'

  const handleStartJourney = () => {
    setCurrentView("onboarding");
  };

  const handleCompleteOnboarding = () => {
    setCurrentView("payment");
  };

  const handleCompletePayment = () => {
    setCurrentView("dashboard");
  };

  const handleLogout = () => {
    onLogout();
    setCurrentView("landing");
  };

  if (currentView === "dashboard") {
    return <Dashboard selectedTier={userProfile?.selected_tier || ""} />;
  }

  if (currentView === "payment") {
    return (
      <div>
        <h1>Payment Page</h1>
        <button onClick={handleCompletePayment}>Complete Payment</button>
      </div>
    );
  }

  if (currentView === "onboarding") {
    return (
      <div>
        <h1>Onboarding Page</h1>
        <button onClick={handleCompleteOnboarding}>Next</button>
      </div>
    );
  }

  return (
    <div className="">
     Hello
    </div>
  );
}
