
export function getNextCronTimes() {
  const now = new Date();
  
  // Next action update: start of next hour
  const nextActionUpdate = new Date(now);
  nextActionUpdate.setHours(nextActionUpdate.getHours() + 1);
  nextActionUpdate.setMinutes(0);
  nextActionUpdate.setSeconds(0);
  nextActionUpdate.setMilliseconds(0);
  
  // Next proposal check: next 5-minute interval
  const nextProposalCheck = new Date(now);
  const minutes = nextProposalCheck.getMinutes();
  const nextInterval = Math.ceil((minutes + 1) / 5) * 5;
  
  if (nextInterval === 60) {
    nextProposalCheck.setHours(nextProposalCheck.getHours() + 1);
    nextProposalCheck.setMinutes(0);
  } else {
    nextProposalCheck.setMinutes(nextInterval);
  }
  nextProposalCheck.setSeconds(0);
  nextProposalCheck.setMilliseconds(0);
  
  return {
    nextActionUpdate,
    nextProposalCheck
  };
}
