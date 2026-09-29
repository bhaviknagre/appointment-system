/*
 * App settings. Change these values to fit your hospital.
 * This file loads before app.js.
 */
window.APP_CONFIG = {
  // Shown in the header, WhatsApp messages and sign-in screens.
  hospitalName: 'Meridian Hospital',

  // Hospital WhatsApp number: country code + number, no "+", spaces or dashes.
  // Example for +91 98765 43210 -> '919876543210'
  hospitalWhatsApp: '919000000000',

  // Length of each appointment slot, in minutes (15 or 30 work well).
  slotMinutes: 15,

  // Lunch break when no slots are offered (24-hour clock).
  lunchStart: '13:00',
  lunchEnd: '14:00',

  // How many days ahead patients can book.
  bookingWindowDays: 14,

  // Departments shown to patients, in this order.
  departments: ['General Medicine', 'Cardiology', 'Orthopedics', 'Pediatrics', 'Dermatology', 'ENT'],

  // DEMO ONLY: password pre-set for the first sample doctor so the sign-in can be tested.
  demoDoctorPassword: 'Clinic@2026'
};
