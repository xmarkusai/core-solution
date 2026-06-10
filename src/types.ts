/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Inquiry {
  id: string;
  fullName: string;
  companyName: string;
  businessEmail: string;
  message: string;
  submittedAt: string;
}

export interface Competency {
  id: string;
  title: string;
  description: string;
  iconName: "BrainCircuit" | "Compass" | "Network" | "Cpu" | "Layers";
  colorTheme: "tertiary" | "secondary" | "primary";
}
