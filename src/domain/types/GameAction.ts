export type GameAction =
	| {
			type: 'play_card';
			playerId: string;
			cardInstanceId: string;
	  }
	| {
			type: 'attack';
			playerId: string;
			attackerId: string;
			target:
				| {
						type: 'hero';
				  }
				| {
						type: 'unit';
						unitId: string;
				  };
	  }
	| {
			type: 'end_turn';
			playerId: string;
	  };
