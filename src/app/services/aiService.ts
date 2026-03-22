import { getAvailableActions } from '../../core/engine/gameEngine.js';
import { getOpponent, getUnitAttack, getUnitCurrentHealth } from '../../core/engine/rules.js';
import type { CardDefinition } from '../../core/entities/Card.js';
import type { BattleState } from '../../core/types/BattleState.js';
import { BattleService, type BattleActionInput } from './battleService.js';
import { CardCatalogService } from './cardCatalogService.js';
import { PlayerRepository } from '../../infra/prisma/repositories/playerRepository.js';

export class AiService {
	constructor(
		private readonly battleService: BattleService,
		private readonly cardCatalogService: CardCatalogService,
		private readonly playerRepository: PlayerRepository
	) {}

	async playTurnLoop(battleId: number): Promise<void> {
		for (let step = 0; step < 20; step += 1) {
			const snapshot = await this.battleService.getBattleSnapshotById(battleId);
			if (!snapshot || snapshot.state.status !== 'active') {
				return;
			}

			const actor = await this.playerRepository.findById(snapshot.state.currentPlayerId);
			if (!actor?.isBot) {
				return;
			}

			const cardLookup = await this.cardCatalogService.getLookupForBattleState(snapshot.state);
			const action = this.chooseAction(snapshot.state, actor.id, cardLookup);
			await this.battleService.applyActionForPlayerId({
				battleId,
				playerId: actor.id,
				action
			});

			if (action.type === 'end_turn') {
				return;
			}
		}
	}

	private chooseAction(
		state: BattleState,
		playerId: number,
		cardLookup: (cardId: string) => CardDefinition
	): BattleActionInput {
		const available = getAvailableActions(state, playerId, cardLookup);
		const player = state.players[playerId];
		const opponent = getOpponent(state, playerId);

		for (const attackerId of available.attackers) {
			const attacker = player.board.find((unit) => unit.instanceId === attackerId);
			if (!attacker) {
				continue;
			}

			const attack = getUnitAttack(player, attacker, cardLookup);
			const lethalTarget = available.targetsByAttacker[attackerId]?.find(
				(target) => target.type === 'hero' && opponent.health <= attack
			);
			if (lethalTarget) {
				return {
					type: 'attack',
					attackerId,
					target: { type: 'hero' }
				};
			}
		}

		if (available.playableCardIds.length > 0) {
			const bestCard = [...available.playableCardIds]
				.map((instanceId) => {
					const card = player.hand.find((item) => item.instanceId === instanceId);
					if (!card) {
						return null;
					}

					const definition = cardLookup(card.cardId);
					const sameSpeciesAllies = player.board.filter(
						(unit) => cardLookup(unit.cardId).species === definition.species
					).length;
					const score =
						definition.cost * 10 +
						(hasAbility(definition, 'guard') ? 20 : 0) +
						(hasAbility(definition, 'pack') ? sameSpeciesAllies * 8 : 0) +
						definition.attack +
						definition.health;

					return { instanceId, score };
				})
				.filter((item): item is { instanceId: number; score: number } => item !== null)
				.sort((left, right) => right.score - left.score)[0];

			if (bestCard) {
				return {
					type: 'play_card',
					cardInstanceId: bestCard.instanceId
				};
			}
		}

		const bestAttack = available.attackers
			.flatMap((attackerId) => {
				const attacker = player.board.find((unit) => unit.instanceId === attackerId);
				if (!attacker) {
					return [];
				}

				const attackerDefinition = cardLookup(attacker.cardId);
				const attackerPower = getUnitAttack(player, attacker, cardLookup);
				return (available.targetsByAttacker[attackerId] ?? []).map((target) => {
					if (target.type === 'hero') {
						return {
							score: attackerPower,
							action: {
								type: 'attack' as const,
								attackerId,
								target: { type: 'hero' as const }
							}
						};
					}

					const unit = opponent.board.find((item) => item.instanceId === target.unitId);
					if (!unit) {
						return {
							score: -1000,
							action: {
								type: 'attack' as const,
								attackerId,
								target: { type: 'unit' as const, unitId: target.unitId }
							}
						};
					}

					const targetDefinition = cardLookup(unit.cardId);
					const defenderPower = getUnitAttack(opponent, unit, cardLookup);
					const targetHealth = getUnitCurrentHealth(targetDefinition, unit);
					const attackerHealth = getUnitCurrentHealth(attackerDefinition, attacker);
					let score = 0;

					if (attackerPower >= targetHealth) {
						score += targetDefinition.cost * 15 + targetDefinition.attack + targetDefinition.health;
					}
					if (defenderPower < attackerHealth) {
						score += attackerDefinition.cost * 5;
					} else {
						score -= attackerDefinition.cost * 8;
					}
					if (hasAbility(targetDefinition, 'guard')) {
						score += 25;
					}

					return {
						score,
						action: {
							type: 'attack' as const,
							attackerId,
							target: { type: 'unit' as const, unitId: target.unitId }
						}
					};
				});
			})
			.sort((left, right) => right.score - left.score)[0];

		if (bestAttack) {
			return bestAttack.action;
		}

		return { type: 'end_turn' };
	}
}

function hasAbility(card: CardDefinition, type: 'guard' | 'pack' | 'hatch'): boolean {
	return card.abilities?.some((ability) => ability.type === type) ?? false;
}
