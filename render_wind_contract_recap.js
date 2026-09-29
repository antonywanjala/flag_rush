  renderWindContractRecap(recap) {
        if (!recap || recap.total === 0) return '';
        const rows = recap.contracts.map(contract => `
          <div class="wind-contract-recap-row ${contract.completed ? 'earned' : 'unfinished'}">
            <span class="wind-contract-recap-state">${contract.completed ? '✦ COMPLETE' : '○ UNFINISHED'}</span>
            <strong>${contract.label}</strong>
            <span class="wind-contract-recap-detail">${contract.completed ? `+${contract.reward.toLocaleString()} PTS SECURED` : `${contract.detail} · NEXT RUN`}</span>
            <small>${contract.description}</small>
          </div>
        `).join('');
        return `<section class="wind-contract-recap ${recap.completed > 0 ? 'has-complete' : ''}" aria-label="Wind replay contract recap">
          <div class="wind-contract-recap-heading">
            <div><span class="wind-contract-recap-kicker">WINDLINES // REPLAY CONTRACTS</span><strong>CONTRACT RECAP</strong></div>
            <strong class="wind-contract-recap-total">${recap.completed}/${recap.total}</strong>
          </div>
          <p class="wind-contract-recap-intro">${recap.completed > 0 ? `${recap.completed} contract${recap.completed === 1 ? '' : 's'} completed during the run. The route paid ${recap.bonusScore.toLocaleString()} bonus points.` : 'Replay the named wind contracts to turn clean line reading into bonus points.'}</p>
          <div class="wind-contract-recap-meta"><span>LINE TYPES <b>${recap.lineTypes}/3</b></span><span>BEST CHAIN <b>${recap.bestChain}</b></span><span>WIND SCORE <b>${recap.precisionScore.toLocaleString()}</b></span></div>
          <div class="wind-contract-recap-list">${rows}</div>
        </section>`;
    }
