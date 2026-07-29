"use client";

import { Component, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  // Shown in place of the broken block, in the owner's language.
  title: string;
};

type State = { message: string | null };

// Keeps one broken block from taking down the whole page. Without it a
// single failing widget blanks the entire cabinet — the founder loses the
// numbers, the timeline and the system status because of one button.
export class ErrorIsland extends Component<Props, State> {
  state: State = { message: null };

  static getDerivedStateFromError(error: Error): State {
    return { message: error.message || "неизвестная ошибка" };
  }

  componentDidCatch(error: Error) {
    console.error("Блок не отобразился:", error);
  }

  render() {
    if (this.state.message !== null) {
      return (
        <div className="form-message form-message--error">
          <strong>{this.props.title}</strong>
          <br />
          Этот блок не отобразился, остальная страница работает. Обновите
          страницу; если повторится — пришлите команде текст: {this.state.message}
        </div>
      );
    }

    return this.props.children;
  }
}
