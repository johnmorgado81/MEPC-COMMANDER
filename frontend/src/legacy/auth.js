export const Auth = { getSession:()=>({user:{email:'local',id:'local'}}), getUser:()=>({email:'local',id:'local'}), sendMagicLink:()=>{}, signOut:()=>location.reload(), onAuthChange:cb=>{setTimeout(()=>cb('SIGNED_IN',{user:{email:'local',id:'local'}}),0);return{unsubscribe:()=>{}};} };
export function showAuthScreen(){}
export function hideAuthScreen(){}
export function renderUserBadge(){}
