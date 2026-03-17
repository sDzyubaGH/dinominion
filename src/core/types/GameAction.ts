export type GameAction =
	| {
			type: 'play_card';
			playerId: number;
			cardInstanceId: number;
	  }
	| {
			type: 'attack';
			playerId: number;
			attackerId: number;
			target:
				| {
						type: 'hero';
				  }
				| {
						type: 'unit';
						unitId: number;
				  };
	  }
	| {
			type: 'end_turn';
			playerId: number;
	  };
