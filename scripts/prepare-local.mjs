/** GitHub에서 받은 배포본의 로컬 설정을 준비합니다. 기존 설정과 실제 비밀값은 덮어쓰지 않습니다. */
import {existsSync,copyFileSync} from 'node:fs';
// 1. 실제 배포 ID가 없는 공유용 설정을 복사합니다. 새 사이트 연결은 배포 도구에서 별도로 수행합니다.
if(!existsSync('.openai/hosting.json'))copyFileSync('.openai/hosting.example.json','.openai/hosting.json');
// 2. 키 없는 예시만 복사합니다. AI를 사용할 때만 본인의 키를 로컬 .dev.vars에 설정하세요.
if(!existsSync('.dev.vars'))copyFileSync('.dev.vars.example','.dev.vars');
console.log('로컬 설정을 준비했습니다. 실제 키와 배포 연결 정보는 Git에 포함되지 않습니다.');
