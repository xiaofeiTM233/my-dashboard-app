"use client";

import React from 'react';
import { FloatButton } from 'antd';
import { AppstoreOutlined, MinusOutlined, EditOutlined, SaveOutlined, CloseOutlined, PlusOutlined } from '@ant-design/icons';

interface ViewToggleProps {
  viewMode: 'minimal' | 'card';
  onViewModeChange: (mode: 'minimal' | 'card') => void;
  isEditMode: boolean;
  onToggleEditMode: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  onAddCard?: () => void;
}

const ViewToggle: React.FC<ViewToggleProps> = ({
  viewMode,
  onViewModeChange,
  isEditMode,
  onToggleEditMode,
  onSave,
  onCancel,
  onAddCard,
}) => {
  return (
    <FloatButton.Group shape="square" style={{ insetInlineEnd: 24 }}>
      <FloatButton
        icon={viewMode === 'minimal' ? <AppstoreOutlined /> : <MinusOutlined />}
        tooltip={viewMode === 'minimal' ? '切换到卡片视图' : '切换到极简视图'}
        onClick={() => onViewModeChange(viewMode === 'minimal' ? 'card' : 'minimal')}
      />
      {viewMode === 'card' && (
        <>
          <FloatButton
            icon={<EditOutlined />}
            tooltip={isEditMode ? '退出编辑模式' : '进入编辑模式'}
            onClick={onToggleEditMode}
            type={isEditMode ? 'primary' : 'default'}
          />
          {isEditMode && (
            <>
              <FloatButton
                icon={<PlusOutlined />}
                tooltip="添加卡片"
                onClick={onAddCard}
                type="primary"
              />
              <FloatButton
                icon={<SaveOutlined />}
                tooltip="保存"
                onClick={onSave}
              />
              <FloatButton
                icon={<CloseOutlined />}
                tooltip="取消"
                onClick={onCancel}
              />
            </>
          )}
        </>
      )}
    </FloatButton.Group>
  );
};

export default ViewToggle;
