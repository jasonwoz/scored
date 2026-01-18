"use client";

import React, { useState, useRef, useEffect } from 'react';

interface ScoreWheelProps {
  value: number;
  onChange: (value: number) => void;
  size?: number;
}

export const ScoreWheel: React.FC<ScoreWheelProps> = ({
  value,
  onChange,
  size = 300
}) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const sliderWidth = size;
  const sliderHeight = 20;

  // Convert score (0-100) to position (0 to sliderWidth)
  const scoreToPosition = (score: number) => {
    return (score / 100) * sliderWidth;
  };

  // Convert position to score (0-100)
  const positionToScore = (position: number) => {
    const score = (position / sliderWidth) * 100;
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  // Get color based on score
  const getScoreColor = (score: number) => {
    if (score <= 33) return '#ef4444'; // Red
    if (score <= 66) return '#eab308'; // Yellow
    return '#22c55e'; // Green
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleMove(e);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      handleMove(e);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMove = (e: MouseEvent | React.MouseEvent) => {
    if (!sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    // Clamp to slider bounds
    const clampedX = Math.max(0, Math.min(sliderWidth, mouseX));

    // Convert position to score
    const newScore = positionToScore(clampedX);
    onChange(newScore);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const thumbPosition = scoreToPosition(value);

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Score Display */}
      <div className="text-center mb-4">
        <div className="text-4xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-500">/100</div>
      </div>

      {/* Linear Slider */}
      <div className="relative">
        <div
          ref={sliderRef}
          className="relative cursor-pointer select-none"
          style={{
            width: sliderWidth,
            height: sliderHeight,
            backgroundColor: '#e5e7eb',
            borderRadius: sliderHeight / 2,
          }}
          onMouseDown={handleMouseDown}
        >
          {/* Filled portion */}
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all duration-150"
            style={{
              width: `${(value / 100) * 100}%`,
              backgroundColor: getScoreColor(value),
            }}
          />

          {/* Thumb */}
          <div
            className="absolute top-1/2 transform -translate-y-1/2 w-6 h-6 bg-white border-2 rounded-full shadow-md transition-all duration-150"
            style={{
              left: `${(value / 100) * 100}%`,
              transform: 'translate(-50%, -50%)',
              borderColor: getScoreColor(value),
              cursor: isDragging ? 'grabbing' : 'grab',
            }}
          />
        </div>

        {/* Tick marks */}
        <div className="flex justify-between mt-2 px-1">
          <span className="text-xs text-gray-400">0</span>
          <span className="text-xs text-gray-400">25</span>
          <span className="text-xs text-gray-400">50</span>
          <span className="text-xs text-gray-400">75</span>
          <span className="text-xs text-gray-400">100</span>
        </div>
      </div>

      {/* Day description */}
      <div className={`text-center px-4 py-2 rounded-lg font-medium ${
        value <= 33 ? 'bg-red-100 text-red-700' :
        value <= 66 ? 'bg-yellow-100 text-yellow-700' :
        'bg-green-100 text-green-700'
      }`}>
        {value <= 33 ? 'Challenging day' :
         value <= 66 ? 'Moderate day' :
         'Great day'}
      </div>
    </div>
  );
};