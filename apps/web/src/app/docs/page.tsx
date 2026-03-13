'use client';

import React from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export default function DocsPage() {
  return (
    <div className="w-full h-screen">
      <SwaggerUI url="/api/docs" />
    </div>
  );
}
