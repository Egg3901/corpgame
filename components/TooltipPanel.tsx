'use client';

import React from 'react';

type Props = {
  children: React.ReactNode;
  className?: string;
};

import { Card, CardBody } from "@heroui/react";

export default function TooltipPanel({ children, className }: Props) {
  return (
    <div className={`absolute bottom-full left-0 mb-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 delay-300 z-50 pointer-events-none ${className || ''}`}>
      <Card
        className="w-[90vw] max-w-[400px] max-h-[70vh] pointer-events-auto bg-gray-900 text-white border-gray-700"
        shadow="lg"
        radius="lg"
      >
        <CardBody className="px-4 py-3 text-xs overflow-y-auto">
          {children}
        </CardBody>
      </Card>
    </div>
  );
}
