// Définition faisant autorité des permissions par rôle, côté serveur.
// Miroir volontaire de src/store/appStore.ts (ROLES) côté frontend : le
// frontend s'en sert pour l'affichage (cacher des boutons), le serveur s'en
// sert pour l'AUTORISATION réelle — c'est cette copie-ci qui protège les
// données, jamais celle du frontend.

export const ROLES = {
  directeur: {
    label: 'Directeur',
    perms: {
      editStudents: true, pay: true, manageCaisse: true, validateExpense: true,
      manageVacataires: true, managePersonnel: true, seeAudit: true, seeSettings: true,
      editClasses: true, manageDebts: true, manageDocuments: true,
    },
  },
  caissiere: {
    label: 'Caissière',
    perms: {
      editStudents: true, pay: true, manageCaisse: true, validateExpense: false,
      manageVacataires: false, managePersonnel: false, seeAudit: false, seeSettings: false,
      editClasses: false, manageDebts: false, manageDocuments: true,
    },
  },
  secretaire: {
    label: 'Secrétaire',
    perms: {
      editStudents: true, pay: false, manageCaisse: false, validateExpense: false,
      manageVacataires: false, managePersonnel: false, seeAudit: false, seeSettings: false,
      editClasses: false, manageDebts: false, manageDocuments: true,
    },
  },
  educateur: {
    label: 'Éducateur',
    perms: {
      editStudents: false, pay: false, manageCaisse: false, validateExpense: false,
      manageVacataires: false, managePersonnel: false, seeAudit: false, seeSettings: false,
      editClasses: false, manageDebts: false, manageDocuments: false,
    },
  },
  comptable: {
    label: 'Comptable / Contrôleur',
    perms: {
      editStudents: false, pay: false, manageCaisse: false, validateExpense: false,
      manageVacataires: false, managePersonnel: false, seeAudit: true, seeSettings: false,
      editClasses: false, manageDebts: false, manageDocuments: false,
    },
  },
  consultation: {
    label: 'Consultation',
    perms: {
      editStudents: false, pay: false, manageCaisse: false, validateExpense: false,
      manageVacataires: false, managePersonnel: false, seeAudit: false, seeSettings: false,
      editClasses: false, manageDebts: false, manageDocuments: false,
    },
  },
}

export function hasPerm(role, key) {
  return !!ROLES[role]?.perms?.[key]
}
