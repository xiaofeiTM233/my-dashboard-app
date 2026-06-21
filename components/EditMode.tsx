"use client";

import React, { useEffect } from 'react';
import { AppState } from './types';

interface EditModeProps {
  isEditMode: boolean;
  onToggleEditMode: () => void;
  onSave: () => void;
  onCancel: () => void;
}

const EditMode: React.FC<EditModeProps> = ({
  isEditMode,
  onToggleEditMode,
  onSave,
  onCancel,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 使用 Ctrl+E 避免干扰输入框中的正常输入
      if (e.key === 'e' && (e.ctrlKey || e.metaKey) && !e.repeat) {
        e.preventDefault();
        onToggleEditMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleEditMode]);

  return (
    <div className="edit-mode-overlay">
      <div className="edit-mode-bar">
        <div className="edit-mode-info">
          <span className="edit-mode-badge">编辑模式</span>
          <span className="edit-mode-hint">按 Shift 键切换</span>
        </div>
        <div className="edit-mode-actions">
          <button
            className="edit-mode-btn cancel-btn"
            onClick={onCancel}
          >
            取消
          </button>
          <button
            className="edit-mode-btn save-btn"
            onClick={onSave}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditMode;
