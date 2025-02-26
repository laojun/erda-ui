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

const inquirer = require('inquirer');
const child_process = require('child_process');
const { logInfo, logSuccess, logWarn, logError } = require('./util/log');
const {
  rootDir,
  publicDir,
  npmCmd,
  moduleList
} = require('./util/env');
const { execSync, spawnSync } = child_process;


const GET_BRANCH_CMD = "git branch | awk '/\\*/ { print $2; }'";
const UPDATE_SUB_MODULES = "git pull --recurse-submodules";

const isProd = process.env.NODE_ENV === 'production';


const getCurrentBranch = async () => {
  execSync(UPDATE_SUB_MODULES);
  const branch = await execSync(GET_BRANCH_CMD);
  return branch.toString();
};

const checkBranch = async () => {
  const branch = await getCurrentBranch();
  logInfo('Current Branch: ', branch);
  if (!branch.startsWith('release')) {
    const answer = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continueBuild',
        message: 'Current branch is not release/*, continue?',
        default: false,
      },
    ]);
    if (!answer.continueBuild) {
      process.exit(0);
    }
  }
};

const whetherGenerateSourceMap = async () => {
  const answer = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'enableSourceMap',
      message: 'Generate source map files?',
      default: false,
    },
  ]);
  return answer.enableSourceMap
}

const checkReInstall = async () => {
  const answer = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'reInstall',
      message: 'Reinstall dependencies?',
      default: true,
    },
  ]);
  if (answer.reInstall) {
    logInfo('start npm install');
    await installDependencies();
  } else {
    logWarn('Skip update Dependencies, please make sure it\'s up to date!');
  }
}


const installDependencies = () => {
  return moduleList.forEach(({moduleDir: dir}) => {
    logInfo(`Performing "npm i" inside ${dir} folder`);
    return spawnSync(npmCmd, ['i'], { env: process.env, cwd: dir, stdio: 'inherit' });
  });
}

const clearPublic = async () => {
  logInfo('clear Public');
  await execSync(`rm -rf ${publicDir}/*`, { cwd: rootDir });
}

const buildAll =  async () => {
  let start = 0;
  const len = moduleList.length;

  while (start < len) {
    const { moduleName, moduleDir } = moduleList[start];
    logInfo(`Building ${moduleName}`);
    await spawnSync(npmCmd, ['run', 'build'], { env: process.env, cwd: moduleDir, stdio: 'inherit' });
    start += 1;
  }
}

module.exports = async () => {
  try {
    await checkBranch();
    let enableSourceMap = false;
    if (!isProd) {
      enableSourceMap = await whetherGenerateSourceMap();
    }

    await clearPublic();

    await checkReInstall();

    await buildAll();

    require('./gen-version')()
    require('./local-icon')()
  } catch (error) {
    logError('build exit with error:', error.message);
    process.exit(1);
  }
};
