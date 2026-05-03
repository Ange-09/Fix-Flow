"use client";

import { useState, useCallback } from "react";
import { useAppContext, CustomMachine } from "@/app/context/AppContext";
import styles from "./AddMachineModal.module.css";

interface AddMachineModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after the machine is added and selectedMachineId is switched. */
  onAdded?: (id: string) => void;
}

interface FormState {
  name: string;
  description: string;
}

const EMPTY_FORM: FormState = { name: "", description: "" };

export default function AddMachineModal({
  isOpen,
  onClose,
  onAdded,
}: AddMachineModalProps) {
  const { addCustomMachine, setSelectedMachineId } = useAppContext();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<FormState>>({});

  // ── Field handler ─────────────────────────────────────────────────────────
  const handleChange = useCallback(
    (field: keyof FormState, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      // Clear error for the field as user types
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    },
    [errors],
  );

  // ── Validation ────────────────────────────────────────────────────────────
  function validate(): boolean {
    const next: Partial<FormState> = {};
    if (!form.name.trim()) next.name = "Machine name is required.";
    if (!form.description.trim())
      next.description = "A short description is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  function handleAdd() {
    if (!validate()) return;

    const id = `custom-${Date.now()}`;

    const machine: CustomMachine = {
      id,
      name: form.name.trim(),
      description: form.description.trim(),
      image: null, // placeholder SVG shown in UpperSection
      isCustom: true,
    };

    addCustomMachine(machine);
    setSelectedMachineId(id);
    onAdded?.(id);

    // Reset form and close
    setForm(EMPTY_FORM);
    setErrors({});
    onClose();
  }

  // ── Cancel ────────────────────────────────────────────────────────────────
  function handleCancel() {
    setForm(EMPTY_FORM);
    setErrors({});
    onClose();
  }

  // ── Backdrop click ────────────────────────────────────────────────────────
  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) handleCancel();
  }

  if (!isOpen) return null;

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="add-machine-title">

        {/* ── Header ── */}
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <span className={styles.pageTag}>New Machine</span>
            <h2 className={styles.modalTitle} id="add-machine-title">
              Add a Machine
            </h2>
          </div>
          <button
            className={styles.closeBtn}
            onClick={handleCancel}
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M14 4L4 14M4 4l10 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <p className={styles.modalSubtitle}>
          Once added, your machine will appear in all modules — KPI, AHP
          Criticality, PF Curve, and Spare Parts — with blank inputs ready to
          fill.
        </p>

        {/* ── Divider ── */}
        <div className={styles.divider} />

        {/* ── Form ── */}
        <div className={styles.formBody}>

          {/* Machine Name */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="am-name">
              Machine Name <span className={styles.required}>*</span>
            </label>
            <input
              id="am-name"
              type="text"
              className={`${styles.input} ${errors.name ? styles.inputError : ""}`}
              placeholder="e.g. CNC Router Machine"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              maxLength={80}
            />
            {errors.name && (
              <span className={styles.errorMsg}>{errors.name}</span>
            )}
          </div>

          {/* Description */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="am-description">
              Description <span className={styles.required}>*</span>
            </label>
            <textarea
              id="am-description"
              className={`${styles.textarea} ${errors.description ? styles.inputError : ""}`}
              placeholder="Brief overview of the machine's role, capabilities, or location on the floor."
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              rows={3}
              maxLength={300}
            />
            {errors.description && (
              <span className={styles.errorMsg}>{errors.description}</span>
            )}
            <span className={styles.charCount}>
              {form.description.length}/300
            </span>
          </div>

          {/* Info callout */}
          <div className={styles.infoCallout}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className={styles.infoIcon}>
              <circle cx="7.5" cy="7.5" r="6.5" stroke="#1a5c2a" strokeWidth="1.4"/>
              <path d="M7.5 6.5v4" stroke="#1a5c2a" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="7.5" cy="4.5" r="0.75" fill="#1a5c2a"/>
            </svg>
            <p className={styles.infoText}>
              Machine image can be added later. All modules will show a
              placeholder until an image is provided.
            </p>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={handleCancel}>
            Cancel
          </button>
          <button className={styles.addBtn} onClick={handleAdd}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M7 1v12M1 7h12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            Add Machine
          </button>
        </div>
      </div>
    </div>
  );
}
