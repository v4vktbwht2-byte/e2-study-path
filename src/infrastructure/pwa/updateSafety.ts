export interface UpdateParticipant {
  readonly id: string;
  readonly isActive: () => boolean;
  readonly flush: () => Promise<void>;
}

export type UpdatePreparationResult =
  | {
      readonly status: "ready";
      readonly flushedParticipantIds: readonly string[];
    }
  | {
      readonly status: "blocked";
      readonly activeParticipantIds: readonly string[];
    }
  | {
      readonly status: "flush-failed";
      readonly failedParticipantIds: readonly string[];
      readonly errors: readonly unknown[];
    };

/**
 * 更新前保存を画面実装からPWA登録処理へ橋渡しする。
 * active判定とflushを関数で保持し、Reactの最新stateを登録し直さず参照できる。
 */
export class UpdateSafetyRegistry {
  private readonly participants = new Map<string, UpdateParticipant>();

  register(participant: UpdateParticipant) {
    if (this.participants.has(participant.id)) {
      throw new Error(`更新準備の登録IDが重複しています: ${participant.id}`);
    }

    this.participants.set(participant.id, participant);
    return () => {
      if (this.participants.get(participant.id) === participant) {
        this.participants.delete(participant.id);
      }
    };
  }

  getActiveParticipantIds() {
    return [...this.participants.values()]
      .filter((participant) => {
        try {
          return participant.isActive();
        } catch {
          return true;
        }
      })
      .map((participant) => participant.id);
  }

  async prepare(): Promise<UpdatePreparationResult> {
    const activeParticipantIds = this.getActiveParticipantIds();
    if (activeParticipantIds.length > 0) {
      return { status: "blocked", activeParticipantIds };
    }

    const participants = [...this.participants.values()];
    const settled = await Promise.allSettled(
      participants.map((participant) => participant.flush()),
    );
    const failedParticipantIds: string[] = [];
    const errors: unknown[] = [];

    settled.forEach((result, index) => {
      if (result.status === "rejected") {
        const participant = participants[index];
        if (participant) {
          failedParticipantIds.push(participant.id);
        }
        errors.push(result.reason);
      }
    });

    if (failedParticipantIds.length > 0) {
      return {
        status: "flush-failed",
        failedParticipantIds,
        errors,
      };
    }

    // flush待機中に利用者が学習を始めた場合も、reloadへ進めない。
    const newlyActiveParticipantIds = this.getActiveParticipantIds();
    if (newlyActiveParticipantIds.length > 0) {
      return {
        status: "blocked",
        activeParticipantIds: newlyActiveParticipantIds,
      };
    }

    return {
      status: "ready",
      flushedParticipantIds: participants.map((participant) => participant.id),
    };
  }
}
