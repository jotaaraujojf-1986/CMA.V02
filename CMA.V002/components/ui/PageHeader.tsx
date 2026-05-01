import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actionPrimary?: React.ReactNode;
  actionSecondary?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, icon, actionPrimary, actionSecondary }) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
      <div className="flex items-center gap-3">
        {icon && (
          <div style={{
            background: 'rgba(26,107,255,.15)',
            border: '1px solid rgba(26,107,255,.25)',
            borderRadius: 10, padding: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {icon}
          </div>
        )}
        <div>
          <h1 style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 22, fontWeight: 700,
            color: 'var(--sf-white)',
            letterSpacing: '-.02em', lineHeight: 1.2,
          }}>
            {title}
          </h1>
          {description && (
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>{description}</p>
          )}
        </div>
      </div>
      {(actionPrimary || actionSecondary) && (
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
          {actionSecondary && <div className="w-full sm:w-auto">{actionSecondary}</div>}
          {actionPrimary  && <div className="w-full sm:w-auto">{actionPrimary}</div>}
        </div>
      )}
    </div>
  );
};
