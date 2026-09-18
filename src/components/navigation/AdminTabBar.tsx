import React from 'react';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { CyberCubicTabBar } from './CyberCubicTabBar';

export function AdminTabBar(props: BottomTabBarProps) {
  return <CyberCubicTabBar {...props} />;
}
