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

import { createStore } from 'app/cube';
import { getDiceVersion, inviteToOrg } from 'layout/services';
import * as DiceWebSocket from 'common/utils/ws';
import { enableIconfont } from 'common/utils';
import routeInfoStore from 'app/common/stores/route';
import { find } from 'lodash';
import { getGlobal } from 'app/global-space';

const sendMsgUtilWsReady = async (targetWs: any, msg: { command: '__detach' | '__attach' }) => {
  while (targetWs.readyState !== 1) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  await layout.effects.notifyWs({ ws: targetWs, ...msg });
};

interface AnnouncementItem {
  [s: string]: any
  id: number
  content: string
}

interface IState {
  currentApp: LAYOUT.IApp,
  appList: LAYOUT.IApp[],
  subSiderInfoMap: Obj,
  isErdaHome: boolean;
  sideFold: boolean,
  subList: {
    [k: string]: any
  },
  announcementList: AnnouncementItem[],
  customMain: Function | JSX.Element | null,
  showMessage: boolean,
  headerInfo: React.ReactElement | null,
  client: {
    height: number,
    width: number
  },
}


const initState: IState = {
  currentApp: {} as LAYOUT.IApp,
  appList: [],
  isErdaHome: false, // 在dice.xx中间页上
  subSiderInfoMap: {},
  subList: {},
  announcementList: [],
  customMain: null,
  showMessage: false,
  headerInfo: null,
  sideFold: false,
  client: {
    height: 0,
    width: 0,
  },
};

const layout = createStore({
  name: 'layout',
  state: initState,
  subscriptions: async ({ listenRoute }: IStoreSubs) => {
    if (getGlobal('erdaInfo.currentOrgId')) {
      const diceWs = DiceWebSocket.connect('/api/websocket');
      listenRoute(({ isEntering, isLeaving }) => {
        if (isEntering('pipeline') || isEntering('dataTask') || isEntering('deploy') || isEntering('testPlanDetail')) {
          // call ws when enter page
          sendMsgUtilWsReady(diceWs, { command: '__attach' });
        } else if (isLeaving('pipeline') || isLeaving('dataTask') || isLeaving('deploy') || isLeaving('testPlanDetail')) {
          sendMsgUtilWsReady(diceWs, { command: '__detach' });
        }
      });
    }
    listenRoute(async ({ isIn, isEntering }) => {
      const { switchToApp, switchMessageCenter } = layout.reducers;
      if (isIn('orgCenter')) {
        switchToApp('orgCenter');
      } else if (isIn('dataCenter')) {
        switchToApp('dataCenter');
      } else if (isIn('workBench')) {
        switchToApp('workBench');
      } else if (isIn('microService')) {
        switchToApp('microService');
      } else if (isIn('edge')) {
        switchToApp('edge');
      // } else if (isIn('sysAdmin')) {
      //   switchToApp(appMap.sysAdmin);
      } else if (isIn('apiManage')) {
        switchToApp('apiManage');
      } else if (isIn('fdp')) {
        switchToApp('diceFdp');
      }

      if (isEntering('orgCenter')
        || isEntering('dataCenter')
        || isEntering('workBench')
        || isEntering('microService')
        || isEntering('edge')
        || isEntering('sysAdmin')
      ) {
        enableIconfont('dice-icon');
      }

      switchMessageCenter(false);
    });
    window.addEventListener('resize', () => {
      layout.reducers.setClient();
    });
  },
  effects: {
    async notifyWs(_, payload: { ws: any, command: '__detach' | '__attach' }) {
      const { params, prevRouteInfo } = routeInfoStore.getState(s => s);
      const { ws, command } = payload;
      const { appId, projectId } = params;
      let scopeType = '';
      let id = '';
      if (appId) {
        id = String(appId);
        scopeType = 'app';
        if (command === '__detach') {
          id = prevRouteInfo.params.appId; // in case switch application, so that use prev route to detach ws
        }
      } else if (projectId) {
        id = String(projectId);
        scopeType = 'project';
      }

      ws.send(JSON.stringify({ command, scope: { type: scopeType, id } }));
    },
    async getDiceVersion({ call }) { //
      const result = await call(getDiceVersion);
      return result;
    },
    async inviteToOrg({ call }, payload: LAYOUT.InviteToOrgPayload) {
      const result = await call(inviteToOrg, payload);
      return result;
    },
  },
  reducers: {
    initLayout(state, payload: LAYOUT.IInitLayout){
      const {appList, currentApp, menusMap = {},key} = payload || {};
      if(key==='sysAdmin' && !getGlobal('erdaInfo.isSysAdmin'))return
        state.appList=appList;
        state.currentApp = currentApp;
        state.subSiderInfoMap = {
          ...state.subSiderInfoMap,
          ...menusMap
        }
    },
    switchToApp(state, payload: string) {
      if (payload === (state.currentApp && state.currentApp.key)) return;
      const curApp = find(state.appList,{key:payload});
      if(curApp){
        state.currentApp = curApp;
      }
    },
    setSubSiderInfoMap(state, payload: { [k: string]: any, key: string }) {
      const { key, ...rest } = payload;
      const siderInfoMap = state.subSiderInfoMap;
      if (!siderInfoMap[key]) {
        siderInfoMap[key] = {};
      }
      siderInfoMap[key] = { ...siderInfoMap[key], ...rest };
    },
    setFullSubSiderInfoMap(state, payload: Obj) {
      state.subSiderInfoMap = {
        ...state.subSiderInfoMap,
        ...payload
      }
    },
    setSubSiderSubList(state, payload: Obj) {
      state.subList = { ...state.subList, ...payload };
    },
    setIsErdaHome(state, isErdaHome = false) {
      state.isErdaHome = isErdaHome;
    },
    setAnnouncementList(state, list: AnnouncementItem[]) {
      state.announcementList = list;
    },
    clearSubSiderSubList(state) {
      state.subList = {};
    },
    setClient(state) {
      state.client = {
        height: document.body.clientHeight,
        width: document.body.clientWidth,
      };
    },
    switchMessageCenter(state, payload) {
      state.showMessage = typeof payload === 'boolean' ? payload : !state.showMessage;
    },
    setHeaderInfo(state, payload) {
      state.headerInfo = payload;
    },
    clearHeaderInfo(state) {
      state.headerInfo = null;
    },
    // 动态更改appList中具体某个app的属性值，e.g. { diceFdp: { href: 'xxxx' } } 来运行时改变href
    updateAppListProperty(state, payload: Obj<Obj>) {
      const [appKey, valueObj] = Object.entries(payload)[0];
      const [key, value] = Object.entries(valueObj)[0];
      const targetApp = state.appList.find((app) => app.key === appKey);
      if (targetApp) {
        targetApp[key] = value;
      }
    },
    toggleSideFold(state, payload: boolean) {
      state.sideFold = payload;
    },
  },
});

export default layout;
