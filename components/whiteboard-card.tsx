"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface WhiteboardCardProps {
  content?: string;
  title?: string;
}

const WhiteboardCard: React.FC<WhiteboardCardProps> = (props) => {
  const safeProps = props ?? {};
  const { content = '', title = '白板' } = safeProps as WhiteboardCardProps;
  const [text, setText] = useState(content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setText(content);
  }, [content]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  }, []);

  return (
    <div className="card-content whiteboard-card">
      <div className="whiteboard-header">
        <h3 className="card-title">{title}</h3>
      </div>
      <textarea
        ref={textareaRef}
        className="whiteboard-textarea"
        value={text}
        onChange={handleChange}
        placeholder="在这里输入内容..."
        spellCheck={false}
      />
    </div>
  );
};

export default WhiteboardCard;
