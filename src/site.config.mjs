// Tous les réglages et textes du site sont ici.
// Après une modification, le site est reconstruit avec `node src/build.mjs`
// (automatique sur GitHub à chaque envoi).

export const SITE_URL = 'https://arkalapp.com';

// Liens de téléchargement : remplace ces deux valeurs par les vrais liens quand l'app sera publiée.
export const STORE_LINKS = {
  appStore: '#app-store',
  googlePlay: '#google-play',
};

export const CONTACT_EMAIL = 'hello@arkalapp.com';
export const YEAR = 2026;

// Chemins des pages dans chaque langue.
export const ROUTES = {
  home: { en: '/', fr: '/fr/' },
  terms: { en: '/terms', fr: '/fr/conditions' },
  privacy: { en: '/privacy', fr: '/fr/confidentialite' },
};

export const TEXT = {
  en: {
    locale: 'en_US',
    switchLabel: 'Français',
    back: '← Arkal',
    footer: { contact: 'Contact', terms: 'Terms', privacy: 'Privacy' },
    sound: { mute: 'Mute sound', unmute: 'Unmute sound' },
    home: {
      title: 'Arkal — Binaural beats for sleep, focus and relaxation',
      description: 'Binaural beats to sleep better, stay focused and unwind, in just a few minutes a day.',
      h1: 'The right frequencies for your mind.',
      lede: 'Binaural beats to sleep better, stay focused and unwind, in just a few minutes a day.',
      downloadOn: 'Download on',
      appStore: 'the App Store',
      googlePlay: 'Google Play',
    },
    terms: {
      title: 'Terms of Use — Arkal',
      description: 'Terms of use and subscription terms of the Arkal app.',
      h1: 'Terms of Use — Arkal',
    },
    privacy: {
      title: 'Privacy Policy — Arkal',
      description: 'How the Arkal app collects, uses and protects your personal data.',
      h1: 'Privacy Policy — Arkal',
    },
    effective: (date) => `Effective date: ${date}`,
    notFound: { title: 'Page not found — Arkal', h1: 'Page not found.', body: 'This page does not exist or has moved.', cta: 'Back to Arkal' },
  },
  fr: {
    locale: 'fr_FR',
    switchLabel: 'English',
    back: '← Arkal',
    footer: { contact: 'Contact', terms: 'Conditions', privacy: 'Confidentialité' },
    sound: { mute: 'Couper le son', unmute: 'Activer le son' },
    home: {
      title: 'Arkal — Sons binauraux pour dormir, se concentrer et se détendre',
      description: 'Des sons binauraux pour mieux dormir, rester concentré et vous détendre, en quelques minutes par jour.',
      h1: 'Les bonnes fréquences pour votre cerveau.',
      lede: 'Des sons binauraux pour mieux dormir, rester concentré et vous détendre, en quelques minutes par jour.',
      downloadOn: 'Télécharger sur',
      appStore: 'l’App Store',
      googlePlay: 'Google Play',
    },
    terms: {
      title: 'Conditions d’utilisation — Arkal',
      description: 'Conditions générales d’utilisation et de vente de l’app Arkal.',
      h1: 'Conditions d’utilisation — Arkal',
    },
    privacy: {
      title: 'Politique de confidentialité — Arkal',
      description: 'Comment l’app Arkal collecte, utilise et protège vos données personnelles.',
      h1: 'Politique de confidentialité — Arkal',
    },
    effective: (date) => `Date d’entrée en vigueur : ${date}`,
  },
};
