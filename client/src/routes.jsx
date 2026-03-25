import React from "react";
import Layout from './components/layouts/MainLayout';
import AlertPopup from './components/layouts/AlertPopup';
import Home from './pages/Home';
import Patient from './pages/patient/Patient';
import Doctor from './pages/doctor/Doctor';
import Reports from './pages/Reports';

// Ensure this is a standard array
const routes = [
  {
    path: '/',
    element: <Layout />, 
    children: [
      {
        index: true,
        element: (
          <>
            <AlertPopup />
            <Home />
          </>
        ),
      },
      {
        path: 'patient',
        element: (
          <>
            <AlertPopup />
            <Patient />
          </>
        ),
      },
      {
        path: 'doctor',
        element: (
          <>
            <AlertPopup />
            <Doctor />
          </>
        ),
      },
      {
        path: 'reports',
        element: (
          <>
            <AlertPopup />
            <Reports />
          </>
        ),
      },
    ],
  },
];

export default routes; // Make sure this is the only default export