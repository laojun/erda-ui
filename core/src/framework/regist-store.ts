// Copyright (c) 2021 Terminus, Inc.
//
// This program is free software: you can use, redistribute, and/or modify
// it under the terms of the GNU Affero General Public License, version 3
// or later ("AGPL"), as published by the Free Software Foundation.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
// FITNESS FOR A PARTICULAR PURPOSE.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program. If not, see <http://www.gnu.org/licenses/>.

import { listenRoute } from '../stores/route';
import { CubeState } from 'cube-state/dist/typings';
import { registerWSHandler } from '../utils/ws';


export const registStore = (store: CubeState.StoreItem) => {
  if (typeof store.subscriptions === 'function') {
    store.subscriptions({
      listenRoute,
      store,
      registerWSHandler,
    });
  }
  return () => {
    if (typeof store.unsubscribe === 'function') {
      store.unsubscribe({
        listenRoute,
        store,
        registerWSHandler,
      });
    }
  };
};
