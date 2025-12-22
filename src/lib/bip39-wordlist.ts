// BIP39 English wordlist - fetched from official source
let cachedWordlist: string[] | null = null;

export async function getBip39Wordlist(): Promise<string[]> {
  if (cachedWordlist) {
    return cachedWordlist;
  }
  
  const response = await fetch(
    'https://raw.githubusercontent.com/bitcoin/bips/master/bip-0039/english.txt'
  );
  const text = await response.text();
  cachedWordlist = text.trim().split('\n');
  return cachedWordlist;
}
